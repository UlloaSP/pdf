"""Password encryption with AES-256."""
from pathlib import Path
from pypdf import PdfReader, PdfWriter


def run(inputs, output_dir, options):
    if len(inputs) != 1:
        raise ValueError("Selecciona un PDF.")
    password = options.get("password", "")
    if not isinstance(password, str) or not password:
        raise ValueError("Introduce una contraseña no vacía.")
    reader = PdfReader(inputs[0])
    if reader.is_encrypted:
        raise ValueError("Desbloquea primero el documento.")
    writer = PdfWriter(clone_from=reader)
    writer.encrypt(password, algorithm="AES-256")
    target = Path(output_dir) / "protegido.pdf"
    writer.write(target)
    return [str(target)]
