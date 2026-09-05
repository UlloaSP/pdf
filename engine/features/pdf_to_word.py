from pathlib import Path

def run(inputs: list[str], output_dir: str, options: dict) -> list[str]:
    if len(inputs) != 1:
        raise ValueError("Selecciona exactamente un archivo.")
    source = Path(inputs[0])
    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)

    from pypdf import PdfReader
    from docx import Document
    pdf = PdfReader(source)
    texts = [page.extract_text() or "" for page in pdf.pages]
    if not any(text.strip() for text in texts):
        raise ValueError("No hay texto extraíble. Ejecuta OCR antes de convertir.")
    document = Document()
    for i, text in enumerate(texts):
        if i:
            document.add_page_break()
        for line in text.splitlines():
            document.add_paragraph(line)
    target = out / "converted.docx"
    document.save(target)
    return [str(target)]
