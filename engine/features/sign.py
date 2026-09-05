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

from io import BytesIO
from reportlab.pdfgen import canvas
from pypdf import Transformation


def overlay_page(page, draw):
    page.transfer_rotation_to_content()
    box = page.cropbox
    width, height = float(box.width), float(box.height)
    buffer = BytesIO()
    layer = canvas.Canvas(buffer, pagesize=(width, height))
    draw(layer, width, height)
    layer.save()
    stamp = PdfReader(buffer).pages[0]
    page.merge_transformed_page(stamp, Transformation().translate(float(box.left), float(box.bottom)))


def latin_text(value):
    text = str(value)
    if not text.strip():
        raise ValueError("Introduce texto.")
    try:
        text.encode("cp1252")
    except UnicodeEncodeError:
        raise ValueError("Esta versión admite texto latino de Windows-1252.") from None
    return text

def run(inputs, output_dir, options):
    reader = read_one(inputs)
    name = latin_text(options.get("name", ""))
    page = number(options, "page", 1, 1)
    if not page.is_integer() or page > len(reader.pages): raise ValueError("Página inválida.")
    x, y = number(options,"x",36), number(options,"y",36)
    writer = PdfWriter(clone_from=reader)
    def draw(layer, width, height):
        label = "Firma visible (sin certificado digital)"
        if x + max(layer.stringWidth(name,"Helvetica-Oblique",20),layer.stringWidth(label,"Helvetica",8)) > width or y < 14 or y+22 > height:
            raise ValueError("La firma no cabe en la posición elegida.")
        layer.setFont("Helvetica-Oblique",20)
        layer.drawString(x,y,name)
        layer.setFont("Helvetica",8)
        layer.drawString(x,y-12,label)
    overlay_page(writer.pages[int(page)-1],draw)
    return [save(writer, output_dir,"firma-visible.pdf")]
