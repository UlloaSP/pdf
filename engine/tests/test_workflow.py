import unittest
from pathlib import Path
import tempfile
from unittest.mock import patch, MagicMock
from reportlab.pdfgen.canvas import Canvas
from pypdf import PdfReader, PdfWriter
from engine.features import workflow as module


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

    def test_rejects_unregistered_or_recursive_steps(self):
        for steps in ('[{"feature":"../../os"}]', '[{"feature":"workflow"}]', '[]'):
            with self.assertRaises(ValueError):
                self.run_feature({"steps":steps})

    def test_real_registered_modules_chain(self):
        import json
        import importlib
        import engine.features
        plugins = self.root / "plugins"
        plugins.mkdir()
        (plugins / "fixture_compress.py").write_text("from pathlib import Path\nfrom pypdf import PdfReader, PdfWriter\ndef run(inputs, output_dir, options):\n    writer = PdfWriter(clone_from=inputs[0])\n    for page in writer.pages: page.compress_content_streams()\n    target = Path(output_dir) / 'result.pdf'\n    writer.write(target)\n    return [str(target)]\n")
        with patch.object(engine.features, "__path__", [str(plugins)]):
            importlib.invalidate_caches()
            outputs = self.run_feature({"steps":json.dumps([{"feature":"fixture_compress"},{"feature":"fixture_compress"}])})
        self.assertIn("SECRET CUSTOMER DATA", PdfReader(outputs[0]).pages[0].extract_text())
        self.assertEqual(len(json.loads(Path(outputs[1]).read_text())), 2)
        self.assertTrue((self.output / "paso-01" / "result.pdf").is_file())

    def test_rejects_output_outside_step_folder(self):
        import importlib
        import engine.features
        plugins = self.root / "unsafe-plugin"
        plugins.mkdir()
        (plugins / "fixture_unsafe.py").write_text("def run(inputs, output_dir, options):\n    return inputs\n")
        with patch.object(engine.features, "__path__", [str(plugins)]):
            importlib.invalidate_caches()
            with self.assertRaisesRegex(ValueError, "fuera"):
                self.run_feature({"steps": '[{"feature":"fixture_unsafe"}]'})
