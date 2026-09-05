"""Lossless PDF stream compression without downsampling."""
from pathlib import Path
from pypdf import PdfReader, PdfWriter


def run(inputs, output_dir, options):
    if len(inputs) != 1:
        raise ValueError("Selecciona un PDF.")
    reader = PdfReader(inputs[0])
    if reader.is_encrypted:
        raise ValueError("Desbloquea el PDF antes de comprimirlo.")
    writer = PdfWriter(clone_from=reader)
    for page in writer.pages:
        page.compress_content_streams()
    target = Path(output_dir) / "comprimido.pdf"
    writer.write(target)
    # Some PDFs already use optimal stream compression. Never enlarge the result.
    original = Path(inputs[0]).read_bytes()
    if target.stat().st_size >= len(original):
        target.write_bytes(original)
    return [str(target)]
