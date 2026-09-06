import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from PIL import Image
from engine.features import image_to_jpg as feature


class ImageToJpgTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)

    def test_transparency_and_original(self):
        source = self.root / "source.png"
        Image.new("RGBA", (12, 8), (255, 0, 0, 0)).save(source)
        before = source.read_bytes()
        result = feature.run([str(source)], str(self.root / "out"), {})
        with Image.open(result[0]) as image:
            self.assertEqual(image.size, (12, 8))
            self.assertEqual(image.getpixel((0, 0)), (255, 255, 255))
        self.assertEqual(source.read_bytes(), before)

    def test_gif_frames_and_tiff_pages(self):
        frames = [Image.new("RGB", (8, 6), color) for color in ("red", "blue")]
        for ext in ("gif", "tiff"):
            source = self.root / f"source.{ext}"
            frames[0].save(source, save_all=True, append_images=frames[1:])
            result = feature.run([str(source)], str(self.root / ext), {})
            self.assertEqual(len(result), 2)
            with Image.open(result[0]) as first, Image.open(result[1]) as last:
                self.assertGreater(first.getpixel((0, 0))[0], 240)
                self.assertGreater(last.getpixel((0, 0))[2], 240)

    def test_orientation(self):
        source = self.root / "source.jpg"
        exif = Image.Exif()
        exif[274] = 6
        Image.new("RGB", (12, 8)).save(source, exif=exif)
        result = feature.run([str(source)], str(self.root / "out"), {})
        with Image.open(result[0]) as image:
            self.assertEqual(image.size, (8, 12))
            self.assertIsNone(image.getexif().get(274))

    def test_rejects_options_and_limits(self):
        with self.assertRaises(ValueError):
            feature.run([], str(self.root), {})
        with self.assertRaises(ValueError):
            feature.run(["unused"], str(self.root), {"quality": 1.5})
        source = self.root / "source.png"
        Image.new("RGB", (12, 8)).save(source)
        with patch.object(feature, "MAX_PIXELS", 50), self.assertRaises(ValueError):
            feature.run([str(source)], str(self.root / "out"), {})

    def test_refuses_existing_output(self):
        source = self.root / "source.png"
        Image.new("RGB", (2, 2)).save(source)
        result = feature.run([str(source)], str(self.root / "out"), {})
        before = Path(result[0]).read_bytes()
        with self.assertRaises(FileExistsError):
            feature.run([str(source)], str(self.root / "out"), {})
        self.assertEqual(Path(result[0]).read_bytes(), before)

    def test_bmp_webp_and_variable_tiff_budget(self):
        for ext in ("bmp", "webp"):
            source = self.root / f"source.{ext}"
            Image.new("RGB", (9, 7), "blue").save(source)
            result = feature.run([str(source)], str(self.root / ext), {})
            with Image.open(result[0]) as image:
                self.assertEqual(image.size, (9, 7))
        source = self.root / "variable.tiff"
        Image.new("RGB", (2, 2)).save(source, save_all=True, append_images=[Image.new("RGB", (9, 9))])
        with patch.object(feature, "MAX_PIXELS", 82), self.assertRaises(ValueError):
            feature.run([str(source)], str(self.root / "variable"), {})

    def test_nonfinite_quality(self):
        for value in (float("inf"), float("-inf"), float("nan")):
            with self.assertRaises(ValueError):
                feature.run(["unused"], str(self.root), {"quality": value})
