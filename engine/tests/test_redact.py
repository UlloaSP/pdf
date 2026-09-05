from contextlib import closing
import unittest
from pathlib import Path
import tempfile
from unittest.mock import patch, MagicMock
from reportlab.pdfgen.canvas import Canvas
from pypdf import PdfReader, PdfWriter
from engine.features import redact as module


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

    def test_removes_original_text_and_pixels(self):
        import json
        import pypdfium2 as pdfium
        result = self.run_feature({"regions": json.dumps([{"page":1,"x":15,"y":30,"width":250,"height":35}]), "dpi":144})[0]
        self.assertEqual(PdfReader(result).pages[0].extract_text(), "")
        self.assertNotIn(b"SECRET CUSTOMER DATA", Path(result).read_bytes())
        with pdfium.PdfDocument(result) as document:
            with closing(document[0]) as page:
                with closing(page.render(scale=1)) as bitmap:
                    image = bitmap.to_pil().convert("RGB")
                self.assertEqual(image.getpixel((30, 45)), (0, 0, 0))
                self.assertEqual(image.getpixel((290, 290)), (255, 255, 255))

    def test_rejects_out_of_bounds(self):
        with self.assertRaises(ValueError):
            self.run_feature({"regions": '[{"page":1,"x":290,"y":0,"width":100,"height":20}]'})

    def test_requires_nonempty_regions(self):
        with self.assertRaises(ValueError):
            self.run_feature()
