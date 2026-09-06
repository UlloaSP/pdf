import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from PIL import Image
from engine.features import image_from_jpg as feature


class ImageFromJpgTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)

    def source(self, name, color="red", size=(12, 8), orientation=None):
        path = self.root / name
        exif = Image.Exif()
        if orientation:
            exif[274] = orientation
        Image.new("RGB", size, color).save(path, "JPEG", exif=exif)
        return str(path)

    def test_png_gif_and_original(self):
        source = self.source("source.jpg")
        before = Path(source).read_bytes()
        for kind in ("PNG", "GIF"):
            result = feature.run([source], str(self.root / kind), {"format": kind})
            with Image.open(result[0]) as image:
                self.assertEqual(image.format, kind)
                self.assertEqual(image.size, (12, 8))
        self.assertEqual(Path(source).read_bytes(), before)

    def test_animation_order_duration(self):
        inputs = [self.source("blue.jpg", "blue"), self.source("red.jpg")]
        result = feature.run(inputs, str(self.root / "out"), {"format": "GIF animado", "duration": 250})
        with Image.open(result[0]) as image:
            self.assertEqual(image.n_frames, 2)
            self.assertEqual(image.info["loop"], 0)
            self.assertEqual(image.info["duration"], 250)
            self.assertGreater(image.convert("RGB").getpixel((0, 0))[2], 240)
            image.seek(1)
            self.assertEqual(image.info["duration"], 250)
            self.assertGreater(image.convert("RGB").getpixel((0, 0))[0], 240)

    def test_orientation(self):
        result = feature.run([self.source("source.jpg", orientation=6)], str(self.root / "out"), {})
        with Image.open(result[0]) as image:
            self.assertEqual(image.size, (8, 12))

    def test_invalid_animation_and_limits(self):
        inputs = [self.source("one.jpg"), self.source("two.jpg", size=(3, 4))]
        for options in ({"format": "GIF animado"}, {"duration": 25}, {"format": "WEBP"}):
            with self.assertRaises(ValueError):
                feature.run(inputs, str(self.root / "out"), options)
        with patch.object(feature, "MAX_PIXELS", 50), self.assertRaises(ValueError):
            feature.run(inputs, str(self.root / "out"), {})
        with self.assertRaises(ValueError):
            feature.run(inputs[:1], str(self.root / "out"), {"format": "GIF animado"})

    def test_reject_non_jpeg_and_existing_output(self):
        source = self.root / "false.jpg"
        Image.new("RGB", (3, 4)).save(source, "PNG")
        with self.assertRaises(ValueError):
            feature.run([str(source)], str(self.root / "out"), {})
        source = self.source("real.jpg")
        result = feature.run([source], str(self.root / "out"), {})
        before = Path(result[0]).read_bytes()
        with self.assertRaises(FileExistsError):
            feature.run([source], str(self.root / "out"), {})
        self.assertEqual(Path(result[0]).read_bytes(), before)
