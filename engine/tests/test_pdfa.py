import unittest
from pathlib import Path
import tempfile
from unittest.mock import patch, MagicMock
from reportlab.pdfgen.canvas import Canvas
from pypdf import PdfReader, PdfWriter
from engine.features import pdfa as module


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

    def test_missing_dependency(self):
        with patch.object(module.shutil, "which", return_value=None):
            with self.assertRaisesRegex(ValueError, "Ghostscript"):
                self.run_feature()

    def test_rejects_invalid_profile(self):
        with patch.object(module.shutil, "which", return_value="gs"):
            with self.assertRaisesRegex(ValueError, "ICC"):
                self.run_feature({"icc_profile":str(self.source)})

    def test_process_failure(self):
        from PIL import ImageCms
        profile = self.root / "rgb.icc"
        profile.write_bytes(ImageCms.ImageCmsProfile(ImageCms.createProfile("sRGB")).tobytes())
        with patch.object(module.shutil, "which", return_value="gs"), patch.object(module.subprocess, "run", return_value=MagicMock(returncode=1, stderr="failed")) as process:
            with self.assertRaisesRegex(ValueError, "Ghostscript"):
                self.run_feature({"icc_profile":str(profile)})
        self.assertIn("-dPDFACompatibilityPolicy=2", process.call_args.args[0])
        self.assertEqual(process.call_args.kwargs["timeout"], 300)

    def test_checks_pdfa_declaration(self):
        from PIL import ImageCms
        from pypdf.generic import DecodedStreamObject, NameObject
        profile = self.root / "rgb.icc"
        profile.write_bytes(ImageCms.ImageCmsProfile(ImageCms.createProfile("sRGB")).tobytes())
        def ghostscript(command, **kwargs):
            target = next(value.split("=", 1)[1] for value in command if value.startswith("-sOutputFile="))
            writer = PdfWriter(clone_from=self.source)
            metadata = DecodedStreamObject()
            metadata.set_data(b'<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/" pdfaid:part="2" pdfaid:conformance="B"/></rdf:RDF></x:xmpmeta>')
            metadata[NameObject("/Type")] = NameObject("/Metadata")
            metadata[NameObject("/Subtype")] = NameObject("/XML")
            writer._root_object[NameObject("/Metadata")] = writer._add_object(metadata)
            writer.write(target)
            return MagicMock(returncode=0, stderr="")
        with patch.object(module.shutil, "which", return_value="gs"), patch.object(module.subprocess, "run", side_effect=ghostscript):
            outputs = self.run_feature({"icc_profile":str(profile)})
        self.assertEqual(len(outputs), 2)
        self.assertIn("SECRET", PdfReader(outputs[0]).pages[0].extract_text())
        self.assertIn("veraPDF", Path(outputs[1]).read_text(encoding="utf-8"))
