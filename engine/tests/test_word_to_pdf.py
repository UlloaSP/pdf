import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from engine.features import word_to_pdf as feature

class ConversionTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.source = self.root / "sample.pdf"
        self.out = self.root / "output"
        from reportlab.pdfgen import canvas
        c = canvas.Canvas(str(self.source))
        c.drawString(72, 720, "Hello PDF")
        c.showPage()
        c.drawString(72, 720, "Second page")
        c.save()

    def test_rejects_empty_input(self):
        with self.assertRaises(ValueError):
            feature.run([], str(self.out), {})

    def test_missing_office(self):
        self.source = self.source.with_suffix(".doc")
        self.source.write_bytes(b"sample")
        with patch.object(feature, "find_office", side_effect=ValueError("Instala LibreOffice")):
            with self.assertRaisesRegex(ValueError, "LibreOffice"):
                feature.run([str(self.source)], str(self.out), {})

    def test_conversion_command_and_output(self):
        original = self.source.read_bytes()
        self.source = self.source.with_suffix(".doc")
        self.source.write_bytes(b"sample")
        def convert(command, **kwargs):
            self.assertIn("--headless", command)
            self.assertEqual(kwargs["timeout"], 180)
            (self.out / "sample.pdf").write_bytes(original)
            from subprocess import CompletedProcess
            return CompletedProcess(command, 0)
        with patch.object(feature, "find_office", return_value="soffice"), patch.object(feature.subprocess, "run", side_effect=convert):
            result = feature.run([str(self.source)], str(self.out), {})
        self.assertTrue(Path(result[0]).is_file())


    def test_external_failure_is_reported(self):
        from subprocess import CompletedProcess
        self.source = self.source.with_suffix(".docx")
        self.source.write_bytes(b"sample")
        with patch.object(feature, "find_office", return_value="soffice"), patch.object(feature.subprocess, "run", return_value=CompletedProcess([], 1)):
            with self.assertRaisesRegex(ValueError, "no pudo"):
                feature.run([str(self.source)], str(self.out), {})

    def test_external_timeout_is_reported(self):
        from subprocess import TimeoutExpired
        self.source = self.source.with_suffix(".docx")
        self.source.write_bytes(b"sample")
        with patch.object(feature, "find_office", return_value="soffice"), patch.object(feature.subprocess, "run", side_effect=TimeoutExpired([], 180)):
            with self.assertRaisesRegex(ValueError, "180"):
                feature.run([str(self.source)], str(self.out), {})
