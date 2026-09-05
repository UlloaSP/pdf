import unittest
from pathlib import Path
import tempfile
from unittest.mock import patch, MagicMock
from reportlab.pdfgen.canvas import Canvas
from pypdf import PdfReader, PdfWriter
from engine.features import protect as module


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

    def test_encrypt_roundtrip(self):
        result = self.run_feature({"password": "correct horse"})[0]
        reader = PdfReader(result)
        self.assertTrue(reader.is_encrypted)
        self.assertFalse(reader.decrypt("wrong"))
        self.assertTrue(reader.decrypt("correct horse"))
        self.assertIn("SECRET CUSTOMER DATA", reader.pages[0].extract_text())
        self.assertEqual(reader.trailer["/Encrypt"]["/Length"], 256)

    def test_empty_password_rejected(self):
        with self.assertRaises(ValueError):
            self.run_feature()
