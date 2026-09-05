import unittest
from pathlib import Path
import tempfile
from unittest.mock import patch, MagicMock
from reportlab.pdfgen.canvas import Canvas
from pypdf import PdfReader, PdfWriter
from engine.features import compress as module


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

    def test_content_and_size(self):
        result = Path(self.run_feature()[0])
        self.assertLessEqual(result.stat().st_size, self.source.stat().st_size)
        self.assertIn("SECRET CUSTOMER DATA", PdfReader(result).pages[0].extract_text())
        self.assertEqual(len(PdfReader(result).pages), 1)

    def test_rejects_encrypted(self):
        writer = PdfWriter(clone_from=self.source)
        writer.encrypt("secret", algorithm="AES-256")
        encrypted = self.root / "encrypted.pdf"
        writer.write(encrypted)
        with self.assertRaises(ValueError):
            self.run_feature(inputs=[str(encrypted)])
