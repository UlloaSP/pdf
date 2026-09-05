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

    def test_extracts_embedded_image(self):
        from PIL import Image
        from reportlab.pdfgen import canvas
        source_image = self.root / "embedded.png"
        Image.new("RGB", (60, 40), "red").save(source_image)
        document = canvas.Canvas(str(self.source))
        document.drawImage(str(source_image), 20, 20, 120, 80)
        document.save()
        paths = feature.run([str(self.source)], str(self.out), {"mode": "Extraer imágenes"})
        self.assertEqual(len(paths), 1)
        with Image.open(paths[0]) as extracted:
            self.assertEqual(extracted.size, (60, 40))
            self.assertGreater(extracted.getpixel((20, 20))[0], 240)

    def test_reports_no_embedded_images(self):
        with self.assertRaisesRegex(ValueError, "incrustadas"):
            feature.run([str(self.source)], str(self.out), {"mode": "Extraer imágenes"})
