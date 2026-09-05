import unittest
from pathlib import Path
import tempfile
from unittest.mock import patch, MagicMock
from reportlab.pdfgen.canvas import Canvas
from pypdf import PdfReader, PdfWriter
from engine.features import repair as module


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

    def test_recovers_broken_xref_pointer(self):
        import re
        self.source.write_bytes(re.sub(rb"startxref\s+\d+", b"startxref\n1", self.source.read_bytes()))
        result = PdfReader(self.run_feature()[0], strict=True)
        self.assertIn("SECRET CUSTOMER DATA", result.pages[0].extract_text())

    def test_unrecoverable_input(self):
        self.source.write_bytes(b"%PDF-1.7\nmissing objects")
        with self.assertRaises(ValueError):
            self.run_feature()
