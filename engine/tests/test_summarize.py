import unittest
from pathlib import Path
import tempfile
from unittest.mock import patch, MagicMock
from reportlab.pdfgen.canvas import Canvas
from pypdf import PdfReader, PdfWriter
from engine.features import summarize as module


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

    def test_requires_local_model(self):
        with self.assertRaises(ValueError):
            self.run_feature({"model":"remote-cloud"})

    def test_http_boundary_and_real_output(self):
        import json
        response = MagicMock(status=200)
        response.read.return_value = json.dumps({"response":"Texto traducido y resumido de prueba."}).encode()
        with patch.object(module.http.client, "HTTPConnection") as connection:
            connection.return_value.getresponse.return_value = response
            outputs = self.run_feature({"model":"local-model", "language":"español"})
        connection.assert_called_once_with("127.0.0.1", 11434, timeout=120)
        if outputs[0].endswith(".pdf"):
            text = "".join(page.extract_text() for page in PdfReader(outputs[0]).pages)
        else:
            text = Path(outputs[0]).read_text(encoding="utf-8")
        self.assertIn("Texto traducido", text)

    def test_no_text_rejected_without_request(self):
        writer = PdfWriter()
        writer.add_blank_page(width=300, height=300)
        writer.write(self.source)
        with patch.object(module.http.client, "HTTPConnection") as connection:
            with self.assertRaises(ValueError):
                self.run_feature({"model":"local-model"})
        connection.assert_not_called()
