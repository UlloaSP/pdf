import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from engine.features import scan as feature

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

    def test_import_capture(self):
        from PIL import Image
        from pypdf import PdfReader
        source = self.root / "capture.jpg"
        Image.new("RGB", (300, 450), "white").save(source)
        result = feature.run([str(source)], str(self.out), {})
        self.assertEqual(len(PdfReader(result[0]).pages), 1)

    def test_wia_acquisition_adapter(self):
        from PIL import Image
        def acquire(path):
            Image.new("RGB", (300, 450), "white").save(path)
        with patch.object(feature, "acquire", side_effect=acquire):
            result = feature.run([], str(self.out), {"mode": "Escáner WIA"})
        self.assertTrue(Path(result[0]).is_file())
        self.assertFalse((self.out / "wia-capture.bmp").exists())

    @unittest.skipUnless(feature.os.name == "nt", "WIA requires Windows")
    def test_wia_hides_console(self):
        from subprocess import CompletedProcess, CREATE_NO_WINDOW
        target = self.root / "capture.bmp"
        def capture(command, **kwargs):
            self.assertEqual(kwargs["creationflags"], CREATE_NO_WINDOW)
            self.assertEqual(kwargs["timeout"], 180)
            target.write_bytes(b"capture")
            return CompletedProcess(command, 0)
        with patch.object(feature.subprocess, "run", side_effect=capture):
            feature.acquire(target)
