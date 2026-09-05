import unittest
from pathlib import Path
import tempfile
from unittest.mock import patch, MagicMock
from reportlab.pdfgen.canvas import Canvas
from pypdf import PdfReader, PdfWriter
from engine.features import unlock as module


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

    def encrypted(self):
        target = self.root / "locked.pdf"
        writer = PdfWriter(clone_from=self.source)
        writer.encrypt("open sesame", algorithm="AES-256")
        writer.write(target)
        return str(target)

    def test_unlock_preserves_text(self):
        reader = PdfReader(self.run_feature({"password": "open sesame"}, [self.encrypted()])[0])
        self.assertFalse(reader.is_encrypted)
        self.assertIn("SECRET CUSTOMER DATA", reader.pages[0].extract_text())

    def test_wrong_password(self):
        with self.assertRaisesRegex(ValueError, "incorrecta"):
            self.run_feature({"password": "bad"}, [self.encrypted()])
