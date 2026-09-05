import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from engine.features import pdf_to_jpg as feature

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

    def test_renders_all_pages(self):
        from PIL import Image
        paths = feature.run([str(self.source)], str(self.out), {"dpi": 72})
        self.assertEqual(len(paths), 2)
        with Image.open(paths[0]) as image:
            self.assertEqual(image.format, "JPEG")
            self.assertGreater(image.width, 500)

    def test_invalid_dpi(self):
        with self.assertRaises(ValueError):
            feature.run([str(self.source)], str(self.out), {"dpi": 0})
