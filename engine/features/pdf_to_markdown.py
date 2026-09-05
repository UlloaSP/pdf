from pathlib import Path

def run(inputs: list[str], output_dir: str, options: dict) -> list[str]:
    if len(inputs) != 1:
        raise ValueError("Selecciona exactamente un archivo.")
    source = Path(inputs[0])
    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)

    import re
    from pypdf import PdfReader
    texts = [page.extract_text() or "" for page in PdfReader(source).pages]
    if not any(text.strip() for text in texts):
        raise ValueError("No hay texto extraíble. Ejecuta OCR antes de convertir.")
    def escape(text):
        return re.sub(r"([\\`*_{}\[\]<>#+.!|~-])", r"\\\1", text)
    content = "\n\n---\n\n".join(f"<!-- Página {i + 1} -->\n\n{escape(text.strip())}" for i, text in enumerate(texts))
    target = out / "converted.md"
    target.write_text(content + "\n", encoding="utf-8")
    return [str(target)]
