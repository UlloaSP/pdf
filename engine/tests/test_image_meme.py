import tempfile
import unittest
from pathlib import Path
from PIL import Image,ImageDraw
from engine.features.image_meme import run


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

    def test_captions_fit_and_keep_middle_untouched(self):
        out=run([self.path],str(self.out),{'top':'ARRIBA '*6,'bottom':'ABAJO','font_size':60})[0]
        with Image.open(out) as image:
            self.assertEqual(image.size,(320,240))
            self.assertEqual(image.getpixel((160,120)),(20,40,60,255))
            self.assertEqual(image.crop((0,0,320,80)).getextrema()[0],(0,255))
            self.assertEqual(image.crop((0,160,320,240)).getextrema()[0],(0,255))

    def test_rejects_unfittable_or_invalid_text(self):
        for options in [{'top':'','bottom':''},{'top':'x'*2001},{'margin':200},{'font_size':float('nan')},{'top':'漢'}]:
            with self.subTest(options=options),self.assertRaises(ValueError): run([self.path],str(self.out),options)
