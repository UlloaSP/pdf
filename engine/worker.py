"""JSON-over-stdio entry point. A fresh process isolates each PDF job."""
import contextlib
import importlib
import json
import pkgutil
import shutil
import sys
import tempfile
from pathlib import Path

import features


def execute(request):
    allowed = {item.name for item in pkgutil.iter_modules(features.__path__)}
    feature = request.get("feature")
    if feature not in allowed or str(feature).startswith("_"):
        raise ValueError("Herramienta desconocida.")
    inputs = request.get("inputs", [])
    if not isinstance(inputs, list) or len(inputs) > 500:
        raise ValueError("Lista de archivos inválida, máximo 500.")
    paths = []
    for item in inputs:
        path = Path(item).resolve(strict=True)
        if not path.is_file():
            raise ValueError("Selecciona archivos, no carpetas.")
        paths.append(str(path))
    destination = Path(request["output_dir"]).resolve(strict=True)
    if not destination.is_dir():
        raise ValueError("La carpeta de destino no existe.")
    options = request.get("options", {})
    if not isinstance(options, dict):
        raise ValueError("Opciones inválidas.")
    folder = Path(tempfile.mkdtemp(prefix=f"pdf-utils-{feature}-", dir=destination))
    try:
        module = importlib.import_module(f"features.{feature}")
        outputs = module.run(paths, str(folder), options)
        if not isinstance(outputs, list) or not outputs:
            raise ValueError("El motor no ha generado archivos.")
        checked = []
        for output in outputs:
            result = Path(output).resolve(strict=True)
            if not result.is_relative_to(folder) or not result.is_file():
                raise ValueError("El motor devolvió una ruta de salida inválida.")
            checked.append(str(result))
        return checked
    except Exception:
        shutil.rmtree(folder, ignore_errors=True)
        raise


def main():
    try:
        raw = sys.stdin.buffer.read(2_000_001)
        if len(raw) > 2_000_000:
            raise ValueError("La solicitud supera el tamaño permitido.")
        with contextlib.redirect_stdout(sys.stderr):
            outputs = execute(json.loads(raw.decode("utf-8")))
        response = {"ok": True, "outputs": outputs, "error": None}
    except Exception as error:
        response = {"ok": False, "outputs": [], "error": str(error)}
    sys.stdout.buffer.write(json.dumps(response, ensure_ascii=False).encode("utf-8"))


if __name__ == "__main__":
    main()
