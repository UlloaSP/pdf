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
    if page.rotation and page.get('/Annots'):
        raise ValueError("Las páginas rotadas con anotaciones requieren aplanar sus anotaciones antes de superponer contenido.")
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
    image_path = str(options.get('image_path','')).strip()
    text = latin_text(options.get("text", "CONFIDENCIAL")) if not image_path else ''
    stamp_image = None
    if image_path:
        from PIL import Image, ImageOps
        from reportlab.lib.utils import ImageReader
        if not Path(image_path).is_file(): raise ValueError("La imagen de marca no existe.")
        with Image.open(image_path) as image:
            stamp_image = ImageReader(ImageOps.exif_transpose(image).convert('RGBA'))
        image_width = number(options,'image_width',200,1)
        pixel_width,pixel_height=stamp_image.getSize()
        image_height=image_width*pixel_height/pixel_width
    size = number(options, "font_size", 32, 1)
    opacity = number(options, "opacity", .25)
    if opacity > 1:
        raise ValueError("La opacidad debe estar entre 0 y 1.")
    writer = PdfWriter(clone_from=reader)
    def draw(layer, width, height):
        layer.setFillAlpha(opacity)
        if stamp_image:
            if image_width > width or image_height > height: raise ValueError("La marca de imagen no cabe en la página.")
            layer.drawImage(stamp_image,(width-image_width)/2,(height-image_height)/2,image_width,image_height,mask='auto')
            return
        fitted = min(size, (width - 24) / max(layer.stringWidth(text, "Helvetica", 1), 1))
        if fitted <= 0: raise ValueError("Página demasiado estrecha.")
        layer.setFont("Helvetica", fitted)
        layer.setFillAlpha(opacity)
        layer.drawCentredString(width / 2, height / 2, text)
    for index in set(pages(options.get("pages", ""), len(reader.pages))):
        overlay_page(writer.pages[index], draw)
    return [save(writer, output_dir, "marca-de-agua.pdf")]
