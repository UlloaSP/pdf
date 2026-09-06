from pathlib import Path
from PIL import Image, ImageOps, UnidentifiedImageError

MAX_PIXELS = 40_000_000


def run(inputs, output_dir, options):
    if not 1 <= len(inputs) <= 100:
        raise ValueError("Selecciona entre 1 y 100 JPG.")
    kind = options.get("format", "PNG")
    if kind not in {"PNG", "GIF", "GIF animado"}:
        raise ValueError("Elige PNG, GIF o GIF animado.")
    try:
        duration = int(options.get("duration", 200))
        if str(options.get("duration", 200)) != str(duration) or not 20 <= duration <= 10000 or duration % 10:
            raise ValueError()
    except (ValueError, TypeError):
        raise ValueError("Duración: múltiplo de 10 entre 20 y 10000 ms.") from None
    if kind == "GIF animado" and len(inputs) < 2:
        raise ValueError("Selecciona al menos dos JPG para animar.")
    frames = []
    total = 0
    try:
        for path in inputs:
            with Image.open(path) as source:
                if source.format != "JPEG":
                    raise ValueError("Esta utilidad solo admite archivos JPG reales.")
                total += source.width * source.height
                if total > MAX_PIXELS:
                    raise ValueError("Máximo 40 millones de píxeles acumulados.")
                frame = ImageOps.exif_transpose(source).convert("RGB")
                frame.info.clear()
                if kind == "GIF animado" and frames and frame.size != frames[0].size:
                    raise ValueError("Los JPG de la animación deben tener el mismo tamaño tras orientarlos.")
                frames.append(frame)
        output = Path(output_dir)
        output.mkdir(parents=True, exist_ok=True)
        if kind == "GIF animado":
            target = output / "animacion.gif"
            with target.open("xb") as stream:
                frames[0].save(stream, "GIF", save_all=True, append_images=frames[1:], duration=duration, loop=0, disposal=2, optimize=False)
            return [str(target)]
        results = []
        for index, frame in enumerate(frames, 1):
            target = output / f"imagen-{index:03d}.{kind.lower()}"
            with target.open("xb") as stream:
                frame.save(stream, kind)
            results.append(str(target))
        return results
    except (UnidentifiedImageError, Image.DecompressionBombError) as error:
        raise ValueError("Imagen no válida o demasiado grande.") from error
    finally:
        for frame in frames:
            frame.close()
