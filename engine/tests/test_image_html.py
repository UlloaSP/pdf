import sys
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch, MagicMock
import subprocess

from PIL import Image
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from features import image_html


class HtmlImageTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.source = self.root / "con espacios.html"
        self.source.write_text("<h1>Hola</h1>", encoding="utf-8")
        self.output = self.root / "out"

    def screenshot(self, command, **kwargs):
        target = next(value.removeprefix("--screenshot=") for value in command if value.startswith("--screenshot="))
        Image.new("RGB", (640, 480), (230, 30, 20)).save(target)
        return 0

    @patch.object(image_html, "browser_path", return_value="chrome")
    def test_html_render_and_original_preserved(self, _):
        before = self.source.read_bytes()
        with patch.object(image_html, "capture", side_effect=self.screenshot) as renderer:
            outputs = image_html.run([str(self.source)], str(self.output), {})
        self.assertIn("%20", renderer.call_args.args[0][-1])
        self.assertEqual(self.source.read_bytes(), before)
        with Image.open(outputs[0]) as image:
            self.assertEqual(image.size, (640, 480))
            self.assertEqual(image.getpixel((1, 1)), (230, 30, 20))
        self.assertEqual(list(self.output.iterdir()), [Path(outputs[0])])

    @patch.object(image_html, "browser_path", return_value="chrome")
    def test_url_jpg(self, _):
        with patch.object(image_html, "capture", side_effect=self.screenshot):
            outputs = image_html.run([], str(self.output), {"url": "https://example.com/", "format": "JPG"})
        with Image.open(outputs[0]) as image:
            self.assertEqual(image.format, "JPEG")

    def test_reject_invalid_input_options_before_browser(self):
        for inputs, options in [([], {}), ([str(self.source)], {"url": "https://example.com"}),
                                ([], {"url": "file:///etc/passwd"}), ([], {"url": "https://user:pass@host/"}),
                                ([str(self.source)], {"width": float("nan")}),
                                ([str(self.source)], {"height": 99999}),
                                ([str(self.source)], {"format": "SVG"})]:
            with self.subTest(options=options), patch.object(image_html, "browser_path") as browser:
                with self.assertRaises(ValueError):
                    image_html.run(inputs, str(self.output), options)
                browser.assert_not_called()

    @patch.object(image_html, "browser_path", return_value="chrome")
    def test_timeout_and_missing_output(self, _):
        for result in (subprocess.TimeoutExpired("chrome", 45), 0):
            with self.subTest(result=result):
                with patch.object(image_html, "capture", side_effect=result if isinstance(result, Exception) else None, return_value=result):
                    with self.assertRaises(ValueError):
                        image_html.run([str(self.source)], str(self.output), {})

    def test_timeout_terminates_browser_tree_before_waiting(self):
        process = MagicMock(pid=1234)
        process.wait.side_effect = [subprocess.TimeoutExpired("chrome", 45), 0]
        process.poll.return_value = 0
        with patch.object(image_html.subprocess, "Popen", return_value=process) as start, patch.object(image_html.subprocess, "run") as stop:
            with self.assertRaises(subprocess.TimeoutExpired):
                image_html.capture(["chrome", "--headless=new"])
        self.assertFalse(start.call_args.kwargs["shell"])
        if image_html.os.name == "nt":
            self.assertEqual(stop.call_args.args[0], ["taskkill", "/PID", "1234", "/T", "/F"])
        self.assertEqual(process.wait.call_count, 2)


if __name__ == "__main__":
    unittest.main()
