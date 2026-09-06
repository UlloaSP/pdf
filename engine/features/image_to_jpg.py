from pathlib import Path
from PIL import Image, ImageOps, UnidentifiedImageError

MAX_PIXELS = 40_000_000
MAX_FRAMES = 200


def run(inputs, output_dir, options):
    if not 1 <= len(inputs) <= 100:
        raise ValueError("Selecciona entre 1 y 100 imágenes.")
    try:
        quality = int(options.get("quality", 90))
        if str(options.get("quality", 90)) != str(quality) or not 1 <= quality <= 95:
            raise ValueError()
    except (ValueError, TypeError, OverflowError):
        raise ValueError("Calidad: usa un entero entre 1 y 95.") from None
    output = Path(output_dir)
    output.mkdir(parents=True, exist_ok=True)
    results = []
    try:
        for index, path in enumerate(inputs, 1):
            with Image.open(path) as source:
                if source.format not in {"JPEG", "PNG", "GIF", "TIFF", "BMP", "WEBP", "PSD"}:
                    raise ValueError("Formato no admitido. Usa PNG, GIF, TIFF, BMP, WEBP, PSD o JPG.")
                frames = getattr(source, "n_frames", 1)
                if frames > MAX_FRAMES or source.width * source.height * frames > MAX_PIXELS:
                    raise ValueError("La imagen supera el límite de 40 millones de píxeles acumulados o 200 fotogramas.")
                total_pixels = 0
                for frame in range(frames):
                    source.seek(frame)
                    total_pixels += source.width * source.height
                    if total_pixels > MAX_PIXELS:
                        raise ValueError("La imagen supera el límite de píxeles.")
                    rgba = ImageOps.exif_transpose(source).convert("RGBA")
                    rgb = Image.new("RGB", rgba.size, "white")
                    rgb.paste(rgba, mask=rgba.getchannel("A"))
                    target = output / f"imagen-{index:03d}-{frame + 1:03d}.jpg"
                    with target.open("xb") as stream:
                        rgb.save(stream, "JPEG", quality=quality)
                    results.append(str(target))
    except (UnidentifiedImageError, Image.DecompressionBombError) as error:
        raise ValueError("Imagen no válida o demasiado grande.") from error
    return results
