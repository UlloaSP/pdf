"""Run registered utility modules sequentially in isolated output folders."""
import importlib
import json
from pathlib import Path
import pkgutil


def _available():
    package = importlib.import_module(__package__)
    return {module.name for module in pkgutil.iter_modules(package.__path__) if not module.ispkg and not module.name.startswith("_") and module.name != "workflow"}


def run(inputs, output_dir, options):
    if not inputs or not all(Path(value).is_file() for value in inputs):
        raise ValueError("Selecciona archivos de entrada existentes.")
    try:
        steps = json.loads(options.get("steps", "[]"))
    except (TypeError, ValueError) as exc:
        raise ValueError("Los pasos deben ser una lista JSON.") from exc
    if not isinstance(steps, list) or not 1 <= len(steps) <= 20:
        raise ValueError("El flujo necesita entre 1 y 20 pasos.")
    allowed = _available()
    for step in steps:
        if not isinstance(step, dict) or not isinstance(step.get("feature"), str) or step["feature"] not in allowed or not isinstance(step.get("options", {}), dict):
            raise ValueError("Cada paso necesita una utilidad registrada y opciones válidas; no se permiten flujos anidados.")
    root = Path(output_dir).resolve()
    current, history = list(inputs), []
    for number, step in enumerate(steps, 1):
        folder = root / f"paso-{number:02d}"
        folder.mkdir()
        module = importlib.import_module(f"{__package__}.{step['feature']}")
        outputs = module.run(current, str(folder), step.get("options", {}))
        if not isinstance(outputs, list) or not outputs:
            raise ValueError(f"El paso {number} no produjo archivos.")
        for output in outputs:
            if not isinstance(output, str):
                raise ValueError(f"El paso {number} devolvió una ruta inválida.")
            path = Path(output).resolve()
            if not path.is_relative_to(folder) or not path.is_file():
                raise ValueError(f"El paso {number} devolvió un archivo fuera de su directorio.")
        current = outputs
        history.append({"step": number, "feature": step["feature"], "outputs": [str(Path(value).relative_to(root)) for value in outputs]})
    manifest = root / "flujo.json"
    manifest.write_text(json.dumps(history, ensure_ascii=False, indent=2), encoding="utf-8")
    return [*current, str(manifest)]
