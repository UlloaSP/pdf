import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from worker import execute


class WorkerTests(unittest.TestCase):
    def test_reject_unknown_module(self):
        with self.assertRaisesRegex(ValueError, "desconocida"):
            execute({"feature": "../../os"})

    def test_cleanup_on_failure(self):
        with tempfile.TemporaryDirectory() as folder:
            with patch("worker.pkgutil.iter_modules") as modules:
                modules.return_value = [type("Module", (), {"name": "failing"})()]
                with patch("worker.importlib.import_module") as imported:
                    imported.return_value.run.side_effect = ValueError("failure")
                    with self.assertRaisesRegex(ValueError, "failure"):
                        execute({"feature": "failing", "output_dir": folder})
            self.assertEqual(list(Path(folder).iterdir()), [])


if __name__ == "__main__":
    unittest.main()
