import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from engine.features import html_to_pdf as feature

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

    def test_html_text_without_scripts(self):
        from pypdf import PdfReader
        self.source = self.source.with_suffix(".html")
        self.source.write_text("<html><head><title>Hidden</title></head><body><h1>Hello &amp; PDF</h1><script>secret()</script><p>Body</p></body></html>", encoding="utf-8")
        result = feature.run([str(self.source)], str(self.out), {})
        text = PdfReader(result[0]).pages[0].extract_text()
        self.assertIn("Hello & PDF", text)
        self.assertNotIn("secret", text)
        self.assertNotIn("Hidden", text)
