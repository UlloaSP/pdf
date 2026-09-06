import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from PIL import Image
from engine.features import image_upscale as feature


class ImageUpscaleTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.source = self.root / "source.png"
        Image.new("RGBA", (12, 8), (255, 0, 0, 80)).save(self.source)

    def test_factors_alpha_and_original(self):
        before = self.source.read_bytes()
        for factor in (2, 4):
            result = feature.run([str(self.source)], str(self.root / str(factor)), {"factor": str(factor)})
            with Image.open(result[0]) as image:
                self.assertEqual(image.size, (12 * factor, 8 * factor))
                self.assertEqual(image.getpixel((0, 0))[3], 80)
        self.assertEqual(self.source.read_bytes(), before)

    def test_orientation(self):
        exif = Image.Exif()
        exif[274] = 6
        Image.new("RGB", (12, 8)).save(self.source, exif=exif)
        result = feature.run([str(self.source)], str(self.root / "out"), {})
        with Image.open(result[0]) as image:
            self.assertEqual(image.size, (16, 24))

    def test_limits_and_factor(self):
        for factor in (0, 3, 2.5, True):
            with self.assertRaises(ValueError):
                feature.run([str(self.source)], str(self.root / "out"), {"factor": factor})
        with patch.object(feature, "MAX_PIXELS", 100), self.assertRaises(ValueError):
            feature.run([str(self.source)], str(self.root / "out"), {})
        self.assertFalse((self.root / "out/ampliada-001.png").exists())

    def test_rejects_animation(self):
        source = self.root / "animated.gif"
        Image.new("RGB", (4, 4), "red").save(source, save_all=True, append_images=[Image.new("RGB", (4, 4), "blue")])
        with self.assertRaises(ValueError):
            feature.run([str(source)], str(self.root / "out"), {})

    def test_does_not_replace(self):
        result = feature.run([str(self.source)], str(self.root / "out"), {})
        before = Path(result[0]).read_bytes()
        with self.assertRaises(FileExistsError):
            feature.run([str(self.source)], str(self.root / "out"), {})
        self.assertEqual(Path(result[0]).read_bytes(), before)
