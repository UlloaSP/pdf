import unittest
from pathlib import Path
import tempfile
from unittest.mock import patch, MagicMock
from reportlab.pdfgen.canvas import Canvas
from pypdf import PdfReader, PdfWriter
from engine.features import compare as module


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

    def test_identical_and_changed(self):
        import json
        first = self.run_feature(inputs=[str(self.source), str(self.source)])
        self.assertFalse(json.loads(Path(first[1]).read_text())[0]["different"])
        other = self.root / "other.pdf"
        canvas = Canvas(str(other), pagesize=(300, 300))
        canvas.drawString(20, 250, "DIFFERENT")
        canvas.showPage()
        canvas.drawString(20, 250, "SECOND PAGE")
        canvas.save()
        second = self.run_feature(inputs=[str(self.source), str(other)])
        records = json.loads(Path(second[1]).read_text())
        self.assertTrue(records[0]["different"])
        self.assertGreater(records[0]["changed_pixels"], 0)
        self.assertFalse(records[1]["left_present"])
        self.assertTrue(all(Path(path).is_file() for path in second))
