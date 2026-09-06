from pathlib import Path
from PIL import Image, ImageOps, UnidentifiedImageError

MAX_PIXELS = 40_000_000


def run(inputs, output_dir, options):
    if not 1 <= len(inputs) <= 100:
        raise ValueError("Selecciona entre 1 y 100 imágenes.")
    factor = str(options.get("factor", "2"))
    if factor not in {"2", "4"}:
        raise ValueError("El factor debe ser 2 o 4.")
    factor = int(factor)
    output = Path(output_dir)
    output.mkdir(parents=True, exist_ok=True)
    results = []
    try:
        for index, path in enumerate(inputs, 1):
            with Image.open(path) as source:
                if source.format not in {"JPEG", "PNG", "WEBP", "BMP", "TIFF", "GIF"}:
                    raise ValueError("Formato de imagen no admitido.")
                if getattr(source, "n_frames", 1) != 1:
                    raise ValueError("La ampliación admite imágenes estáticas; extrae primero los fotogramas.")
                if source.width * source.height * factor * factor > MAX_PIXELS:
                    raise ValueError("El resultado supera 40 millones de píxeles. Reduce el factor o la imagen.")
                image = ImageOps.exif_transpose(source).convert("RGBA")
                image.info.clear()
                resized = image.resize((image.width * factor, image.height * factor), Image.Resampling.LANCZOS)
                target = output / f"ampliada-{index:03d}.png"
                with target.open("xb") as stream:
                    resized.save(stream, "PNG")
                resized.close()
                image.close()
                results.append(str(target))
    except (UnidentifiedImageError, Image.DecompressionBombError) as error:
        raise ValueError("Imagen no válida o demasiado grande.") from error
    return results
