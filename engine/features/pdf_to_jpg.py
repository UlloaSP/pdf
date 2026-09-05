from contextlib import closing
from pathlib import Path

def run(inputs: list[str], output_dir: str, options: dict) -> list[str]:
    if len(inputs) != 1:
        raise ValueError("Selecciona exactamente un archivo.")
    source = Path(inputs[0])
    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)

    import pypdfium2 as pdfium
    try:
        dpi = int(options.get("dpi", 144))
    except (ValueError, TypeError):
        raise ValueError("DPI debe ser un número entre 72 y 300.")
    if not 72 <= dpi <= 300:
        raise ValueError("DPI debe estar entre 72 y 300.")
    results = []
    with pdfium.PdfDocument(str(source)) as pdf:
        for i in range(len(pdf)):
            with closing(pdf[i]) as page:
                if page.get_width() * page.get_height() * (dpi / 72) ** 2 > 100_000_000:
                    raise ValueError("Página demasiado grande. Reduce los DPI.")
                with closing(page.render(scale=dpi / 72)) as bitmap:
                    image = bitmap.to_pil().convert("RGB")
                    target = out / f"page-{i + 1:04d}.jpg"
                    image.save(target, quality=90, dpi=(dpi, dpi))
                    image.close()
                    results.append(str(target))
    return results
