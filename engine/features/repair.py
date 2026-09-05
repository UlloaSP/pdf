"""Recover readable PDF objects using pypdf's tolerant parser."""
from pathlib import Path
from pypdf import PdfReader, PdfWriter


def run(inputs, output_dir, options):
    if len(inputs) != 1:
        raise ValueError("Selecciona un PDF.")
    try:
        reader = PdfReader(inputs[0], strict=False)
        if reader.is_encrypted:
            raise ValueError("Desbloquea el documento antes de repararlo.")
        if not reader.pages:
            raise ValueError("No se han recuperado páginas.")
        writer = PdfWriter(clone_from=reader)
        target = Path(output_dir) / "reparado.pdf"
        writer.write(target)
        PdfReader(target, strict=True)
    except ValueError:
        raise
    except Exception as exc:
        raise ValueError("No se puede recuperar este PDF; faltan objetos o datos esenciales.") from exc
    return [str(target)]
