import importlib.util
from pathlib import Path
import tempfile
import unittest
from pypdf import PdfReader
from reportlab.pdfgen import canvas

spec = importlib.util.spec_from_file_location("feature_under_test", Path(__file__).parents[1] / "features" / "forms.py")
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

        form = str(Path(self.tmp.name) / 'form.pdf')
        c = canvas.Canvas(form,pagesize=(400,500))
        c.acroForm.textfield(name='nombre',x=30,y=100,width=200,height=30)
        c.showPage(); c.save()
        reader = PdfReader(run([form],str(self.out),{'values':'{"nombre":"Ana"}'})[0])
        self.assertEqual(reader.get_form_text_fields()['nombre'],'Ana')
        with self.assertRaises(ValueError): run([form],str(self.out),{'values':'{"missing":"x"}'})
        with self.assertRaises(ValueError): run([self.pdf],str(self.out),{'values':'{"nombre":"x"}'})

    def test_create_and_fill_text_and_checkbox(self):
        import json
        definitions = [dict(name='nombre', type='text', x=30, y=100, value='Ana'), dict(name='acepto',type='checkbox',x=30,y=50)]
        created = run([self.pdf],str(self.out),{'mode':'Crear campos','definitions':json.dumps(definitions)})[0]
        reader=PdfReader(created)
        self.assertEqual(len(reader.pages),3)
        self.assertIn('Page 1',reader.pages[0].extract_text())
        self.assertEqual(reader.get_form_text_fields()['nombre'],'Ana')
        filled=run([created],str(self.out/'filled'),{'values':'{"nombre":"Bea","acepto":true}'})[0]
        fields=PdfReader(filled).get_fields()
        self.assertEqual(fields['nombre']['/V'],'Bea')
        self.assertEqual(fields['acepto']['/V'],'/Yes')

    def test_rejects_field_outside_page(self):
        with self.assertRaisesRegex(ValueError,'no cabe'):
            run([self.pdf],str(self.out),{'mode':'Crear campos','definitions':'[{"name":"x","x":999}]'})

    def test_rejects_empty_input(self):
        with self.assertRaises(ValueError):
            run([],str(self.out),{})

if __name__ == '__main__':
    unittest.main()
