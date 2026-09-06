import json
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from PIL import Image
from engine.features import image_remove_background as feature


class RemoveBackgroundTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.source = self.root / "source.png"
        exif = Image.Exif()
        exif[274] = 6
        Image.new("RGB", (12, 8), "red").save(self.source, exif=exif)
        self.executable = self.root / "rembg.exe"
        self.executable.write_bytes(b"external executable fixture")
        self.model = self.root / "model.onnx"
        self.model.write_bytes(b"external ONNX fixture")
        self.options = {"executable": str(self.executable), "model_path": str(self.model)}
        self.output = self.root / "out"

    def invoke(self):
        return feature.run([str(self.source)], str(self.output), self.options)

    def test_external_boundary_orientation_alpha_and_cleanup(self):
        before = self.source.read_bytes()
        def external(command, **kwargs):
            self.assertFalse(kwargs["shell"])
            self.assertEqual(kwargs["timeout"], 180)
            self.assertEqual(command[1:5], ["i", "-m", "u2net_custom", "-x"])
            self.assertEqual(json.loads(command[5]), {"model_path": str(self.model.resolve())})
            with Image.open(command[-2]) as prepared:
                self.assertEqual(prepared.size, (8, 12))
                image = prepared.convert("RGBA")
                image.putalpha(70)
                image.save(command[-1])
            return subprocess.CompletedProcess(command, 0)
        with patch.object(feature.subprocess, "run", side_effect=external):
            result = self.invoke()
        with Image.open(result[0]) as image:
            self.assertEqual(image.getpixel((0, 0))[3], 70)
            self.assertEqual(image.size, (8, 12))
        self.assertEqual(self.source.read_bytes(), before)
        self.assertEqual([p.name for p in self.output.iterdir()], ["sin-fondo.png"])

    def test_missing_model_or_executable_never_executes(self):
        with patch.object(feature.subprocess, "run") as process:
            self.model.unlink()
            with self.assertRaises(ValueError):
                self.invoke()
            self.executable.unlink()
            with self.assertRaises(ValueError):
                self.invoke()
            process.assert_not_called()

    def test_timeout_and_failure_clean_temporary_files(self):
        for effect in (subprocess.TimeoutExpired("rembg", 180), OSError("bad executable")):
            with patch.object(feature.subprocess, "run", side_effect=effect), self.assertRaises(ValueError):
                self.invoke()
            self.assertEqual(list(self.output.iterdir()), [])
        with patch.object(feature.subprocess, "run", return_value=subprocess.CompletedProcess([], 1)), self.assertRaises(ValueError):
            self.invoke()

    def test_missing_or_invalid_output(self):
        with patch.object(feature.subprocess, "run", return_value=subprocess.CompletedProcess([], 0)), self.assertRaises(ValueError):
            self.invoke()
        def external(command, **kwargs):
            Image.new("RGB", (8, 12)).save(command[-1])
            return subprocess.CompletedProcess(command, 0)
        with patch.object(feature.subprocess, "run", side_effect=external), self.assertRaises(ValueError):
            self.invoke()

    def test_limits_animation_and_existing_output(self):
        with patch.object(feature, "MAX_PIXELS", 50), self.assertRaises(ValueError):
            self.invoke()
        Image.new("RGB", (4, 4), "red").save(self.source, "GIF", save_all=True, append_images=[Image.new("RGB", (4, 4), "blue")])
        with self.assertRaises(ValueError):
            self.invoke()
        self.output.mkdir(exist_ok=True)
        target = self.output / "sin-fondo.png"
        target.write_bytes(b"existing")
        with self.assertRaises(FileExistsError):
            self.invoke()
        self.assertEqual(target.read_bytes(), b"existing")
