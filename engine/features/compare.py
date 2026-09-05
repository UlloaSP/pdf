from contextlib import closing
"""Visual PDF comparison with page previews and changed-pixel counts."""
from pathlib import Path
import html
import json
from PIL import Image, ImageChops
import pypdfium2 as pdfium


def _render(document, index):
    if index >= len(document):
        return None
    with closing(document[index]) as page:
        with closing(page.render(scale=1)) as bitmap:
            return bitmap.to_pil().convert("RGB")


def run(inputs, output_dir, options):
    if len(inputs) != 2:
        raise ValueError("Selecciona exactamente dos PDF para comparar.")
    root = Path(output_dir)
    results, sections, outputs = [], [], []
    with pdfium.PdfDocument(inputs[0]) as left, pdfium.PdfDocument(inputs[1]) as right:
        for index in range(max(len(left), len(right))):
            images = [_render(left, index), _render(right, index)]
            width = max(im.width for im in images if im)
            height = max(im.height for im in images if im)
            normalized = []
            for im in images:
                canvas = Image.new("RGB", (width, height), "white")
                if im:
                    canvas.paste(im, (0, 0))
                normalized.append(canvas)
            difference = ImageChops.difference(*normalized)
            red, green, blue = difference.split()
            mask = ImageChops.lighter(ImageChops.lighter(red, green), blue).point(lambda value: 255 if value else 0)
            changed = mask.histogram()[255]
            different = changed > 0 or images[0] is None or images[1] is None or images[0].size != images[1].size
            result = {"page": index + 1, "different": different, "changed_pixels": changed,
                      "left_present": images[0] is not None, "right_present": images[1] is not None}
            results.append(result)
            preview = Image.new("RGB", (width * 3, height), "white")
            preview.paste(normalized[0], (0, 0))
            preview.paste(normalized[1], (width, 0))
            preview.paste(difference, (width * 2, 0))
            name = f"pagina-{index + 1:04d}.png"
            preview.save(root / name)
            outputs.append(str(root / name))
            sections.append(f'<h2>Página {index + 1}: {"distinta" if different else "igual"}</h2><p>{changed} píxeles cambiados</p><img src="{name}" alt="Original, nuevo y diferencia de página {index + 1}">')
    report = root / "comparacion.html"
    report.write_text('<!doctype html><html lang="es"><meta charset="utf-8"><title>Comparación PDF</title><style>body{font:16px system-ui;margin:2rem}img{max-width:100%;border:1px solid #888}</style><h1>Comparación visual a 72 ppp</h1><p>' + html.escape(Path(inputs[0]).name) + " / " + html.escape(Path(inputs[1]).name) + '</p><p>Cada imagen: original, nuevo y diferencia. No compara metadatos, texto invisible ni estructura.</p>' + "".join(sections) + "</html>", encoding="utf-8")
    data = root / "comparacion.json"
    data.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    return [str(report), str(data), *outputs]
