import tempfile
import unittest
from pathlib import Path
from PIL import Image,ImageDraw
from engine.features.image_edit import run


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

    def test_effect_and_border_preserve_original(self):
        source=Path(self.path).read_bytes()
        out=run([self.path],str(self.out),{'effect':'Invertir','border':5,'border_color':'red'})[0]
        with Image.open(out) as image:
            self.assertEqual(image.size,(330,250))
            self.assertEqual(image.getpixel((0,0)),(255,0,0,255))
            self.assertEqual(image.getpixel((100,100)),(235,215,195,255))
        self.assertEqual(Path(self.path).read_bytes(),source)

    def test_sticker_alpha_and_text(self):
        sticker=Path(self.tmp.name)/'sticker.png'
        Image.new('RGBA',(20,20),(255,0,0,128)).save(sticker)
        out=run([self.path],str(self.out),{'sticker_path':str(sticker),'sticker_width':20,'text':'Hola','text_y':60})[0]
        with Image.open(out) as image:
            self.assertGreater(image.getpixel((15,15))[0],100)
            self.assertNotEqual(image.crop((10,60,100,95)).getextrema()[0],(20,20))

    def test_rejects_invalid_options(self):
        for options in [{'brightness':float('nan')},{'contrast':4},{'effect':'magic'},{'text':'x','text_x':500},{'sticker_path':'missing.png'},{'text':'漢'}]:
            with self.subTest(options=options),self.assertRaises(ValueError): run([self.path],str(self.out),options)

    def test_accented_glyphs_have_distinct_rendering(self):
        from engine.features.image_edit import text_layer
        plain=text_layer('o',32,'white')
        accented=text_layer('ó',32,'white')
        self.assertGreater(accented.height,plain.height)
        # Different accented vowels must not be the same missing-glyph box.
        self.assertNotEqual(text_layer('ó',32,'white').tobytes(),text_layer('í',32,'white').tobytes())
