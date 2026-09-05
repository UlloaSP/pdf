import importlib.util
from pathlib import Path
import tempfile
import unittest
from pypdf import PdfReader
from reportlab.pdfgen import canvas

spec = importlib.util.spec_from_file_location("feature_under_test", Path(__file__).parents[1] / "features" / "jpg_to_pdf.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
run = module.run


class FeatureTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.pdf = str(Path(self.tmp.name) / 'input.pdf')
        self.out = Path(self.tmp.name) / 'output'
        c = canvas.Canvas(self.pdf, pagesize=(400,500))
        for i in range(1,4):
            c.drawString(40,400,f'Page {i}')
            c.showPage()
        c.save()

    def test_real_document(self):

        from PIL import Image
        image = str(Path(self.tmp.name) / 'input.png')
        Image.new('RGBA', (300,150), (255,0,0,128)).save(image)
        reader = PdfReader(run([image,image], str(self.out), {'dpi': 150})[0])
        self.assertEqual(len(reader.pages), 2)
        self.assertEqual(float(reader.pages[0].mediabox.width), 144)
        with self.assertRaises(ValueError): run([image], str(self.out), {'dpi': 0})

    def test_rejects_empty_input(self):
        with self.assertRaises(ValueError):
            run([],str(self.out),{})

if __name__ == '__main__':
    unittest.main()
