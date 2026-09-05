import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from engine.features import pdf_to_excel as feature

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

    def test_page_sheets(self):
        from openpyxl import load_workbook
        result = feature.run([str(self.source)], str(self.out), {})
        workbook = load_workbook(result[0])
        self.addCleanup(workbook.close)
        self.assertEqual(len(workbook.worksheets), 2)
        self.assertIn("Hello PDF", workbook.worksheets[0]["A1"].value)


    def test_image_only_pdf_requires_ocr(self):
        from pypdf import PdfWriter
        writer = PdfWriter()
        writer.add_blank_page(width=300, height=400)
        writer.write(self.source)
        with self.assertRaisesRegex(ValueError, "OCR"):
            feature.run([str(self.source)], str(self.out), {})
