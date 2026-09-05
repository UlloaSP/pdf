from contextlib import closing
from pathlib import Path

def run(inputs: list[str], output_dir: str, options: dict) -> list[str]:
    if len(inputs) != 1:
        raise ValueError("Selecciona exactamente un archivo.")
    source = Path(inputs[0])
    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)

    mode = options.get("mode", "Renderizar páginas")
    if mode not in ("Renderizar páginas", "Extraer imágenes"):
        raise ValueError("Modo de conversión desconocido.")
    if mode == "Extraer imágenes":
        from pypdf import PdfReader
        from PIL import Image
        results = []
        for page_index, page in enumerate(PdfReader(source).pages, 1):
            for image_index, embedded in enumerate(page.images, 1):
                original = embedded.image
                if original is None:
                    raise ValueError("No se pudo decodificar una imagen incrustada.")
                if original.width * original.height > 100_000_000:
                    raise ValueError("Imagen incrustada demasiado grande.")
                rgba = original.convert("RGBA")
                background = Image.new("RGB", rgba.size, "white")
                try:
                    background.paste(rgba, mask=rgba.getchannel("A"))
                    target = out / f"page-{page_index:04d}-image-{image_index:04d}.jpg"
                    background.save(target, quality=95)
                    results.append(str(target))
                finally:
                    rgba.close()
                    background.close()
                    original.close()
        if not results:
            raise ValueError("El PDF no contiene imágenes incrustadas extraíbles.")
        return results

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
