import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from PIL import Image, ImageSequence
from engine.features import image_resize as feature


class ImageTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.source = self.root / "image.png"
        self.out = self.root / "out"
        self.options = {'percent': 50}
        image = Image.new("RGBA", (80,60), (240,20,10,255))
        image.putpixel((5,5),(0,200,0,0))
        image.save(self.source, icc_profile=b"test-profile", dpi=(96,96))

    def test_real_png_original_and_metadata(self):
        before = self.source.read_bytes()
        result = feature.run([str(self.source)], str(self.out), self.options)
        self.assertEqual(len(result),1)
        self.assertEqual(before,self.source.read_bytes())
        with Image.open(result[0]) as image:
            self.assertEqual(image.format,"PNG")
            self.assertEqual(image.info['icc_profile'],b'test-profile')
            self.assertEqual(image.size,(40, 30))
            self.assertLess(image.convert('RGBA').getchannel('A').getextrema()[0],255)

    def test_duplicate_names_get_unique_outputs(self):
        other = self.root / 'nested'
        other.mkdir()
        copy = other / self.source.name
        copy.write_bytes(self.source.read_bytes())
        paths=feature.run([str(self.source),str(copy)],str(self.out),self.options)
        self.assertEqual(len(set(paths)),2)
        self.assertTrue(all(Path(path).is_file() for path in paths))

    def test_gif_keeps_timeline_loop_and_pixels(self):
        gif=self.root/'animation.gif'
        frames=[Image.new('RGB',(80,60),color) for color in ('red','blue')]
        frames[0].save(gif,save_all=True,append_images=frames[1:],duration=[70,130],loop=3)
        output=feature.run([str(gif)],str(self.out),self.options)[0]
        with Image.open(output) as image:
            self.assertEqual(image.n_frames,2)
            self.assertEqual(image.info['loop'],3)
            decoded=[(frame.info['duration'],frame.convert('RGB').getpixel((0,0))) for frame in ImageSequence.Iterator(image)]
            self.assertEqual(decoded,[(70,(255,0,0)),(130,(0,0,255))])

    def test_exif_orientation_is_normalized(self):
        jpg=self.root/'exif.jpg'
        image=Image.new('RGB',(80,60),'red')
        exif=Image.Exif(); exif[274]=6
        image.save(jpg,exif=exif)
        output=feature.run([str(jpg)],str(self.out),self.options)[0]
        with Image.open(output) as result:
            self.assertEqual(result.size,(30, 40))
            self.assertIsNone(result.getexif().get(274))

    def test_transparent_gif_composited_frames(self):
        gif=self.root/'transparent.gif'
        frames=[]
        for color in ('red','blue'):
            image=Image.new('RGBA',(80,60),(0,0,0,0))
            image.paste(color,(10,10,30,30))
            frames.append(image)
        frames[0].save(gif,save_all=True,append_images=frames[1:],duration=[70,130],loop=0,disposal=2)
        with Image.open(gif) as original:
            expected=[]
            for frame in ImageSequence.Iterator(original):
                with frame.convert('RGBA') as rgba:
                    transformed=feature.transform(rgba,2,self.options)
                    expected.append(transformed.copy())
                    transformed.close()
        output=feature.run([str(gif)],str(self.out),self.options)[0]
        with Image.open(output) as result:
            self.assertEqual(result.n_frames,2)
            for index,frame in enumerate(ImageSequence.Iterator(result)):
                actual=frame.convert('RGBA')
                self.assertEqual(actual.getchannel('A').tobytes(),expected[index].getchannel('A').point(lambda a:255 if a>=128 else 0).tobytes())
                for x,y in [(0,0),(min(10,actual.width-1),min(10,actual.height-1))]:
                    if actual.getpixel((x,y))[3] == 255:
                        self.assertEqual(actual.getpixel((x,y))[:3],expected[index].getpixel((x,y))[:3])
        for frame in expected: frame.close()

    def test_bounds_and_empty_input(self):
        with self.assertRaises(ValueError): feature.run([],str(self.out),self.options)
        with patch.object(feature,'MAX_PIXELS',10):
            with self.assertRaisesRegex(ValueError,'límite'):
                feature.run([str(self.source)],str(self.out),self.options)
        self.assertFalse(list(self.out.glob('*')))

    def test_apng_rejected_before_writing(self):
        source=self.root/'animated.png'
        first=Image.new('RGB',(80,60),'red'); second=Image.new('RGB',(80,60),'blue')
        first.save(source,save_all=True,append_images=[second],duration=100)
        with self.assertRaisesRegex(ValueError,'animaciones PNG'):
            feature.run([str(source)],str(self.out),self.options)
        self.assertFalse(list(self.out.glob('*')))

    def test_rejects_svg_and_bad_option(self):
        source=self.root/'image.svg'; source.write_text('<svg/>')
        with self.assertRaises(ValueError): feature.run([str(source)],str(self.out),self.options)
        with self.assertRaises(ValueError): feature.run([str(self.source)],str(self.out),{'percent': -1})

    def test_dimensions_ratio_and_stretch(self):
        path=feature.run([str(self.source)],str(self.out),{'mode':'Dimensiones','width':40,'height':40})[0]
        with Image.open(path) as image: self.assertEqual(image.size,(40,30))
        path=feature.run([str(self.source)],str(self.out/'stretch'),{'mode':'Dimensiones','width':40,'height':40,'keep_ratio':False})[0]
        with Image.open(path) as image: self.assertEqual(image.size,(40,40))
