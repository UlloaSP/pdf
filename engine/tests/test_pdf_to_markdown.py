import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from engine.features import pdf_to_markdown as feature

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

    def test_text_and_page_markers(self):
        result = feature.run([str(self.source)], str(self.out), {})
        text = Path(result[0]).read_text(encoding="utf-8")
        self.assertIn("Hello PDF", text)
        self.assertIn("Página 2", text)


    def test_image_only_pdf_requires_ocr(self):
        from pypdf import PdfWriter
        writer = PdfWriter()
        writer.add_blank_page(width=300, height=400)
        writer.write(self.source)
        with self.assertRaisesRegex(ValueError, "OCR"):
            feature.run([str(self.source)], str(self.out), {})
