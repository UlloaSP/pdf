import tempfile
import unittest
from pathlib import Path
from PIL import Image,ImageDraw
from engine.features.image_watermark import run


class ImageFeatureTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.path=str(Path(self.tmp.name)/'source.png')
        self.out=Path(self.tmp.name)/'output'
        Image.new('RGBA',(320,240),(20,40,60,255)).save(self.path)

    def test_empty_input(self):
        with self.assertRaises(ValueError): run([],str(self.out),{})

    def test_outputs_unique_and_original_unchanged(self):
        before=Path(self.path).read_bytes()
        options={}
        first=run([self.path],str(self.out),options)[0]
        second=run([self.path],str(self.out),options)[0]
        self.assertNotEqual(first,second)
        self.assertEqual(Path(first).parent,self.out)
        self.assertEqual(Path(self.path).read_bytes(),before)

    def test_exif_orientation(self):
        image=Image.new('RGB',(240,320),(20,40,60))
        exif=Image.Exif(); exif[274]=6
        image.save(self.path,format='JPEG',exif=exif)
        output=run([self.path],str(self.out),{})[0]
        with Image.open(output) as result:
            self.assertEqual(result.size,(320,240))
            self.assertNotIn(274,result.getexif())

    def test_image_opacity_and_position(self):
        mark=Path(self.tmp.name)/'mark.png'
        Image.new('RGBA',(20,20),(220,40,60,255)).save(mark)
        out=run([self.path],str(self.out),{'image_path':str(mark),'image_width':20,'opacity':50,'position':'Arriba izquierda'})[0]
        with Image.open(out) as image:
            self.assertEqual(image.getpixel((15,15)),(120,40,60,255))
            self.assertEqual(image.getpixel((200,200)),(20,40,60,255))

    def test_text_changes_pixels(self):
        out=run([self.path],str(self.out),{'text':'Marca','position':'Centro'})[0]
        with Image.open(out) as image: self.assertGreater(image.getextrema()[0][1],20)

    def test_rejects_invalid_options(self):
        for options in [{'opacity':float('nan')},{'opacity':101},{'margin':500},{'position':'other'},{'text':''}]:
            with self.subTest(options=options),self.assertRaises(ValueError): run([self.path],str(self.out),options)

    def test_accented_glyphs_have_distinct_rendering(self):
        from engine.features.image_watermark import text_layer
        plain=text_layer('o',32,'white')
        accented=text_layer('ó',32,'white')
        self.assertGreater(accented.height,plain.height)
        # Different accented vowels must not be the same missing-glyph box.
        self.assertNotEqual(text_layer('ó',32,'white').tobytes(),text_layer('í',32,'white').tobytes())
