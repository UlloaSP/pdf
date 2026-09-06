import tempfile
import unittest
from pathlib import Path
from PIL import Image,ImageDraw
from engine.features.image_pixelate import run


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
        options={'regions': '[{"x":10,"y":10,"width":30,"height":30}]'}
        first=run([self.path],str(self.out),options)[0]
        second=run([self.path],str(self.out),options)[0]
        self.assertNotEqual(first,second)
        self.assertEqual(Path(first).parent,self.out)
        self.assertEqual(Path(self.path).read_bytes(),before)

    def test_exif_orientation(self):
        image=Image.new('RGB',(240,320),(20,40,60))
        exif=Image.Exif(); exif[274]=6
        image.save(self.path,format='JPEG',exif=exif)
        output=run([self.path],str(self.out),{'regions': '[{"x":10,"y":10,"width":30,"height":30}]'})[0]
        with Image.open(output) as result:
            self.assertEqual(result.size,(320,240))
            self.assertNotIn(274,result.getexif())

    def test_pixelates_only_selected_region(self):
        image=Image.new('RGB',(320,240),'white')
        draw=ImageDraw.Draw(image)
        for x in range(0,320,2): draw.line((x,0,x,239),fill='black')
        image.save(self.path)
        out=run([self.path],str(self.out),{'regions':'[{"x":10,"y":10,"width":40,"height":40}]','strength':10})[0]
        with Image.open(out) as result:
            self.assertEqual(result.getpixel((11,11)),result.getpixel((12,11)))
            self.assertNotEqual(result.getpixel((61,11)),result.getpixel((62,11)))

    def test_blur_changes_region(self):
        image=Image.new('RGB',(320,240),'white'); ImageDraw.Draw(image).rectangle((20,20,30,30),fill='black'); image.save(self.path)
        out=run([self.path],str(self.out),{'regions':'[{"x":10,"y":10,"width":40,"height":40}]','mode':'Difuminar','strength':5})[0]
        with Image.open(out) as result:
            self.assertGreater(result.getpixel((25,25))[0],0)
            self.assertEqual(result.getpixel((100,100)),(255,255,255,255))

    def test_rejects_bad_regions_and_strength(self):
        for options in [{'regions':'x'},{'regions':'[]'},{'regions':'[{"x":310,"y":1,"width":20,"height":20}]'},{'regions':'[{"x":NaN,"y":1,"width":20,"height":20}]'},{'strength':float('nan')}]:
            with self.subTest(options=options),self.assertRaises(ValueError): run([self.path],str(self.out),options)
