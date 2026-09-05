from contextlib import closing
"""Burn selected regions into fresh page images; retain no original objects."""
import json
import math
from pathlib import Path
from PIL import ImageDraw
import pypdfium2 as pdfium
from reportlab.pdfgen.canvas import Canvas
from reportlab.lib.utils import ImageReader


def run(inputs, output_dir, options):
    if len(inputs) != 1:
        raise ValueError("Selecciona un PDF.")
    try:
        regions = json.loads(options.get("regions", "[]"))
        dpi = int(options.get("dpi", 144))
    except (TypeError, ValueError) as exc:
        raise ValueError("Introduce regiones JSON válidas y resolución entera.") from exc
    if dpi < 72 or dpi > 300:
        raise ValueError("La resolución debe estar entre 72 y 300 ppp.")
    if not isinstance(regions, list) or not regions:
        raise ValueError('Introduce al menos una región: [{"page":1,"x":0,"y":0,"width":100,"height":40}].')
    with pdfium.PdfDocument(inputs[0]) as document:
        normalized = []
        for region in regions:
            try:
                page_number = region["page"]
                if isinstance(page_number, bool) or not isinstance(page_number, int) or not 1 <= page_number <= len(document):
                    raise ValueError()
                x, y, width, height = (float(region[key]) for key in ("x", "y", "width", "height"))
                with closing(document[page_number - 1]) as page:
                    page_width, page_height = page.get_size()
                if not all(math.isfinite(v) for v in (x, y, width, height)) or x < 0 or y < 0 or width <= 0 or height <= 0 or x + width > page_width or y + height > page_height:
                    raise ValueError()
                normalized.append((page_number - 1, x, y, width, height))
            except (KeyError, TypeError, ValueError) as exc:
                raise ValueError("Región inválida: página desde 1, coordenadas en puntos desde arriba a la izquierda, dentro de la página.") from exc
        target = Path(output_dir) / "censurado.pdf"
        canvas = Canvas(str(target), pageCompression=1)
        scale = dpi / 72
        for index in range(len(document)):
            with closing(document[index]) as page:
                width, height = page.get_size()
                with closing(page.render(scale=scale)) as bitmap:
                    image = bitmap.to_pil().convert("RGB")
                draw = ImageDraw.Draw(image)
                for number, x, y, w, h in normalized:
                    if number == index:
                        draw.rectangle((math.floor(x * scale), math.floor(y * scale), math.ceil((x + w) * scale), math.ceil((y + h) * scale)), fill="black")
                canvas.setPageSize((width, height))
                canvas.drawImage(ImageReader(image), 0, 0, width, height)
                canvas.showPage()
        canvas.save()
    return [str(target)]
