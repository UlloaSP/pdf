import json
from pathlib import Path
import unittest


class FeatureContractTests(unittest.TestCase):
    def test_descriptors_match_modules_and_form_types(self):
        root = Path(__file__).resolve().parents[2]
        descriptors = list((root / "src/features").glob("*.json"))
        modules = {path.stem for path in (root / "engine/features").glob("*.py") if not path.name.startswith("_")}
        self.assertEqual({path.stem for path in descriptors}, modules)
        for path in descriptors:
            with self.subTest(feature=path.stem):
                feature = json.loads(path.read_text(encoding="utf-8"))
                self.assertEqual(feature["id"], path.stem)
                for key in ("name", "description"):
                    self.assertIsInstance(feature[key], str)
                    self.assertTrue(feature[key].strip())
                self.assertIn(feature["category"], ["Páginas", "Conversión", "Edición", "Seguridad", "Avanzadas"])
                self.assertIsInstance(feature["multiple"], bool)
                self.assertIsInstance(feature["requirements"], list)
                self.assertTrue(all(isinstance(value, str) for value in feature["requirements"]))
                self.assertTrue(feature["extensions"])
                self.assertTrue(all(isinstance(value, str) and value for value in feature["extensions"]))
                keys = []
                for field in feature["fields"]:
                    keys.append(field["key"])
                    self.assertIsInstance(field["label"], str)
                    self.assertIn(field["type"], ["text", "number", "select", "checkbox", "password", "textarea"])
                    if field["type"] == "select":
                        self.assertIn(field.get("default"), field["options"])
                self.assertEqual(len(keys), len(set(keys)))
