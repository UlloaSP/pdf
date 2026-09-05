from pathlib import Path
import math
from pypdf import PdfReader, PdfWriter


def number(options, key, default, minimum=0):
    try:
        value = float(options.get(key, default))
    except (TypeError, ValueError):
        raise ValueError(f"{key}: introduce un número válido.") from None
    if not math.isfinite(value) or value < minimum:
        raise ValueError(f"{key}: valor fuera de rango.")
    return value


def read_one(inputs):
    if len(inputs) != 1:
        raise ValueError("Selecciona exactamente un PDF.")
    reader = PdfReader(inputs[0])
    if reader.is_encrypted:
        raise ValueError("Desbloquea el PDF antes de usar esta utilidad.")
    if not reader.pages:
        raise ValueError("El PDF no contiene páginas.")
    return reader


def pages(spec, count):
    if not str(spec).strip():
        return list(range(count))
    result = []
    try:
        for part in str(spec).split(','):
            bounds = [int(x.strip()) for x in part.split('-')]
            if len(bounds) == 1:
                start = end = bounds[0]
            elif len(bounds) == 2:
                start, end = bounds
            else:
                raise ValueError()
            if not 1 <= start <= end <= count:
                raise ValueError()
            result.extend(range(start - 1, end))
    except (TypeError, ValueError):
        raise ValueError("Páginas inválidas. Usa números desde 1, por ejemplo 1,3-5.") from None
    return result


def save(writer, output_dir, name):
    target = Path(output_dir) / name
    target.parent.mkdir(parents=True, exist_ok=True)
    with target.open('xb') as stream:
        writer.write(stream)
    return str(target)

from PIL import Image, ImageOps
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader


def run(inputs, output_dir, options):
    if not inputs: raise ValueError("Selecciona al menos una imagen.")
    dpi = number(options, "dpi", 150, 10)
    if dpi > 1200: raise ValueError("La resolución máxima es 1200 DPI.")
    target = Path(output_dir) / "imagenes.pdf"
    target.parent.mkdir(parents=True, exist_ok=True)
    with target.open('xb') as stream:
        document = canvas.Canvas(stream)
        for path in inputs:
            with Image.open(path) as original:
                image = ImageOps.exif_transpose(original).convert("RGBA")
                background = Image.new("RGB", image.size, "white")
                background.paste(image, mask=image.getchannel("A"))
                width, height = image.width * 72 / dpi, image.height * 72 / dpi
                document.setPageSize((width, height))
                document.drawImage(ImageReader(background), 0, 0, width, height)
                document.showPage()
        document.save()
    return [str(target)]
