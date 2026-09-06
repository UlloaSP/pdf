"""Local image transformation with bounded decoded memory and animated GIF support."""
from pathlib import Path
import math
from PIL import Image, ImageOps, UnidentifiedImageError

MAX_PIXELS = 16_000_000
MAX_TOTAL_PIXELS = 32_000_000
MAX_FRAMES = 200


def integer(options, key, default, minimum=0, maximum=100000):
    value = options.get(key, default)
    try:
        number = float(value)
    except (TypeError, ValueError):
        raise ValueError(f"{key}: introduce un número entero válido.") from None
    if isinstance(value, bool) or not math.isfinite(number) or not number.is_integer() or not minimum <= number <= maximum:
        raise ValueError(f"{key}: valor entero fuera de rango.")
    return int(number)


def check_size(size, count):
    width, height = size
    if width < 1 or height < 1 or width * height > MAX_PIXELS or width * height * count > MAX_TOTAL_PIXELS:
        raise ValueError("La imagen supera el límite de 16 millones de píxeles por fotograma o 32 millones por animación.")


def gif_frame(image, colors):
    rgba = image.convert("RGBA")
    try:
        rgb = rgba.convert("RGB")
        try:
            result = rgb.quantize(colors=min(colors, 255), method=Image.Quantize.MEDIANCUT)
        finally:
            rgb.close()
        palette = result.getpalette() or []
        result.putpalette((palette + [0] * 768)[:768])
        alpha = rgba.getchannel("A")
        mask = alpha.point(lambda value: 255 if value < 128 else 0)
        result.paste(255, mask=mask)
        alpha.close()
        mask.close()
        result.info["transparency"] = 255
        return result
    finally:
        rgba.close()


def process(source, target_dir, ordinal, options, operation):
    frames = []
    try:
        with Image.open(source) as original:
            format = original.format
            if format not in ("JPEG", "PNG", "GIF"):
                raise ValueError("Solo se admiten JPG, PNG estático y GIF. SVG no está soportado.")
            count = getattr(original, "n_frames", 1)
            if count > MAX_FRAMES:
                raise ValueError("Se admiten como máximo 200 fotogramas.")
            if count > 1 and format != "GIF":
                raise ValueError("Las animaciones PNG no están soportadas. Usa un GIF animado.")
            if original.mode not in ("1", "L", "LA", "P", "RGB", "RGBA", "CMYK"):
                raise ValueError("Solo se admiten imágenes de 8 bits por canal.")
            check_size(original.size, count)
            metadata = {key: original.info[key] for key in ("icc_profile", "dpi") if key in original.info}
            loop = original.info.get("loop")
            durations = []
            for index in range(count):
                original.seek(index)
                check_size(original.size, count)
                durations.append(original.info.get("duration", 0))
                frame = ImageOps.exif_transpose(original)
                try:
                    transformed = operation(frame, count, options)
                finally:
                    frame.close()
                if format == "GIF":
                    try:
                        frames.append(gif_frame(transformed, integer(options, "gif_colors", 256, 2, 256)))
                    finally:
                        transformed.close()
                else:
                    frames.append(transformed)
            extension = {"JPEG": "jpg", "PNG": "png", "GIF": "gif"}[format]
            target = target_dir / f"{ordinal:03d}-{Path(source).stem}.{extension}"
            parameters = {}
            if format == "JPEG":
                if frames[0].mode not in ("RGB", "L", "CMYK"):
                    converted = frames[0].convert("RGB")
                    frames[0].close()
                    frames[0] = converted
                parameters = dict(quality=integer(options, "quality", 85, 1, 95), optimize=True, **metadata)
            elif format == "PNG":
                parameters = dict(optimize=True, compress_level=9, **metadata)
            else:
                parameters = dict(save_all=True, append_images=frames[1:], duration=durations, disposal=2,
                                  transparency=255, optimize=False)
                if loop is not None:
                    parameters["loop"] = loop
            # EXIF is omitted after orientation normalization; no stale orientation or dimensions.
            for frame in frames:
                frame.info.pop("exif", None)
                frame.info.pop("comment", None)
            with target.open("xb") as stream:
                frames[0].save(stream, format=format, **parameters)
            return str(target)
    except (UnidentifiedImageError, Image.DecompressionBombError, OSError) as error:
        raise ValueError(f"No se pudo procesar {Path(source).name}: {error}") from error
    finally:
        for frame in frames:
            frame.close()


def run(inputs: list[str], output_dir: str, options: dict) -> list[str]:
    if not inputs or len(inputs) > 100:
        raise ValueError("Selecciona entre 1 y 100 imágenes.")
    validate(options)
    target_dir = Path(output_dir)
    target_dir.mkdir(parents=True, exist_ok=True)
    return [process(source, target_dir, index, options, transform) for index, source in enumerate(inputs, 1)]

def validate(options):
    if options.get("mode", "Porcentaje") not in ("Porcentaje", "Dimensiones"):
        raise ValueError("Modo de tamaño desconocido.")
    if options.get("mode", "Porcentaje") == "Porcentaje":
        integer(options, "percent", 50, 1, 1000)
    else:
        integer(options, "width", 800, 1, 100000)
        integer(options, "height", 600, 1, 100000)
        if not isinstance(options.get("keep_ratio", True), bool):
            raise ValueError("Conservar proporción debe ser verdadero o falso.")


def transform(frame, count, options):
    if options.get("mode", "Porcentaje") == "Porcentaje":
        scale = integer(options, "percent", 50, 1, 1000) / 100
        size = (max(1, round(frame.width * scale)), max(1, round(frame.height * scale)))
    else:
        width, height = integer(options, "width", 800, 1, 100000), integer(options, "height", 600, 1, 100000)
        if options.get("keep_ratio", True):
            scale = min(width / frame.width, height / frame.height)
            size = (max(1, round(frame.width * scale)), max(1, round(frame.height * scale)))
        else:
            size = (width, height)
    check_size(size, count)
    # Expand indexed PNG/GIF before resampling to preserve transparency.
    if frame.mode in ("P", "1"):
        with frame.convert("RGBA") as expanded:
            return expanded.resize(size, Image.Resampling.LANCZOS)
    return frame.resize(size, Image.Resampling.LANCZOS)
