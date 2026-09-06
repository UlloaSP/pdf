from pathlib import Path
import json
import os
import shutil
import subprocess
import tempfile
from PIL import Image, ImageOps, UnidentifiedImageError

MAX_PIXELS = 16_000_000


def run(inputs, output_dir, options):
    if len(inputs) != 1:
        raise ValueError("Selecciona exactamente una imagen.")
    executable_option = str(options.get("executable", "")).strip()
    executable = Path(executable_option or shutil.which("rembg") or "__rembg_not_found__").resolve()
    if not executable.is_file() or executable.name.lower() not in {"rembg.exe", "rembg"}:
        raise ValueError("Instala rembg CLI aparte e indica la ruta a rembg.exe.")
    model = Path(str(options.get("model_path", ""))).expanduser().resolve()
    if not model.is_file() or model.suffix.lower() != ".onnx" or not 1 <= model.stat().st_size <= 2_000_000_000:
        raise ValueError("Selecciona un modelo U2NET .onnx local existente, de hasta 2 GB. No se descargan modelos.")
    output = Path(output_dir)
    output.mkdir(parents=True, exist_ok=True)
    target = output / "sin-fondo.png"
    if target.exists() or target.is_symlink():
        raise FileExistsError("La salida ya existe.")
    try:
        with Image.open(inputs[0]) as source:
            if source.format not in {"JPEG", "PNG", "WEBP", "BMP", "TIFF", "GIF"}:
                raise ValueError("Formato de imagen no admitido.")
            if getattr(source, "n_frames", 1) != 1:
                raise ValueError("Selecciona una imagen estática.")
            if source.width * source.height > MAX_PIXELS:
                raise ValueError("Máximo 16 millones de píxeles.")
            image = ImageOps.exif_transpose(source).convert("RGBA")
            image.info.clear()
        with image, tempfile.TemporaryDirectory(prefix="rembg-", dir=output) as temporary:
            prepared = Path(temporary) / "entrada.png"
            processed = Path(temporary) / "resultado.png"
            image.save(prepared, "PNG")
            # Custom U2NET loads this exact local path instead of downloading a model.
            command = [str(executable), "i", "-m", "u2net_custom", "-x", json.dumps({"model_path": str(model)}), str(prepared), str(processed)]
            try:
                result = subprocess.run(command, shell=False, timeout=180, capture_output=True,
                                        creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0)
            except subprocess.TimeoutExpired as error:
                raise ValueError("rembg superó el tiempo máximo de 180 segundos.") from error
            except OSError as error:
                raise ValueError("No se pudo ejecutar rembg CLI. Revisa la instalación externa.") from error
            if result.returncode != 0:
                raise ValueError("rembg falló. Comprueba que el modelo sea ONNX U2NET compatible y que el motor esté instalado.")
            if not processed.is_file():
                raise ValueError("rembg no produjo una imagen.")
            with Image.open(processed) as background_removed:
                if background_removed.format != "PNG" or background_removed.size != image.size or "A" not in background_removed.getbands():
                    raise ValueError("rembg devolvió una imagen sin canal alfa o con dimensiones incorrectas.")
                background_removed.info.clear()
                with target.open("xb") as stream:
                    background_removed.save(stream, "PNG")
        return [str(target)]
    except (UnidentifiedImageError, Image.DecompressionBombError) as error:
        raise ValueError("Imagen no válida o demasiado grande.") from error
