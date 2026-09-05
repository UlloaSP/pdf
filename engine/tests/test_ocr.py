import unittest
from pathlib import Path
import tempfile
from unittest.mock import patch, MagicMock
from reportlab.pdfgen.canvas import Canvas
from pypdf import PdfReader, PdfWriter
from engine.features import ocr as module


class Tests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.source = self.root / "input.pdf"
        self.output = self.root / "out"
        self.output.mkdir()
        canvas = Canvas(str(self.source), pagesize=(300, 300), pageCompression=0)
        canvas.drawString(20, 250, "SECRET CUSTOMER DATA")
        canvas.drawString(20, 80, "PUBLIC INFORMATION")
        canvas.save()

    def run_feature(self, options=None, inputs=None):
        return module.run(inputs if inputs is not None else [str(self.source)], str(self.output), options or {})

    def test_requires_inputs(self):
        with self.assertRaises(ValueError):
            self.run_feature(inputs=[])

    def test_missing_dependency(self):
        with patch.object(module.shutil, "which", return_value=None):
            with self.assertRaisesRegex(ValueError, "Tesseract"):
                self.run_feature()

    def test_searchable_output_at_process_boundary(self):
        def tesseract(command, **kwargs):
            self.assertTrue(Path(command[1]).is_file())
            self.assertEqual(command[-1], "pdf")
            writer = PdfWriter(clone_from=self.source)
            writer.write(Path(command[2]).with_suffix(".pdf"))
            return MagicMock(returncode=0, stderr="")
        with patch.object(module.shutil, "which", return_value="tesseract"), patch.object(module.subprocess, "run", side_effect=tesseract):
            result = self.run_feature({"language": "spa+eng"})[0]
        self.assertIn("SECRET CUSTOMER DATA", PdfReader(result).pages[0].extract_text())
        self.assertEqual(list(self.output.iterdir()), [Path(result)])

    def test_rejects_invalid_language(self):
        with self.assertRaises(ValueError):
            self.run_feature({"language": "--help"})

    def test_failed_process_has_no_result(self):
        with patch.object(module.shutil, "which", return_value="tesseract"), patch.object(module.subprocess, "run", return_value=MagicMock(returncode=1, stderr="missing spa")):
            with self.assertRaisesRegex(ValueError, "idiomas"):
                self.run_feature()
        self.assertEqual(list(self.output.iterdir()), [])
