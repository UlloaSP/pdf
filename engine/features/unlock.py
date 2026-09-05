"""Remove PDF encryption using the supplied password."""
from pathlib import Path
from pypdf import PdfReader, PdfWriter


def run(inputs, output_dir, options):
    if len(inputs) != 1:
        raise ValueError("Selecciona un PDF.")
    password = options.get("password", "")
    if not isinstance(password, str):
        raise ValueError("La contraseña debe ser texto.")
    reader = PdfReader(inputs[0])
    if reader.is_encrypted and not reader.decrypt(password):
        raise ValueError("Contraseña incorrecta.")
    target = Path(output_dir) / "desbloqueado.pdf"
    PdfWriter(clone_from=reader).write(target)
    return [str(target)]
