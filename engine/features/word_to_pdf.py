from pathlib import Path
import shutil
import subprocess
import tempfile

def find_office():
    for name in ("soffice", "libreoffice"):
        found = shutil.which(name)
        if found:
            return found
    for directory in ("C:/Program Files", "C:/Program Files (x86)"):
        candidate = Path(directory) / "LibreOffice/program/soffice.exe"
        if candidate.is_file():
            return str(candidate)
    raise ValueError("Instala LibreOffice para realizar esta conversión.")

def run(inputs: list[str], output_dir: str, options: dict) -> list[str]:
    if len(inputs) != 1:
        raise ValueError("Selecciona exactamente un archivo.")
    source = Path(inputs[0])
    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)

    if source.suffix.lower() not in ('.doc', '.docx', '.odt'):
        raise ValueError("El tipo de archivo no corresponde a esta conversión.")
    executable = find_office()
    with tempfile.TemporaryDirectory(dir=out) as profile:
        try:
            process = subprocess.run([executable, "-env:UserInstallation=" + Path(profile).as_uri(),
                "--headless", "--convert-to", "pdf:writer_pdf_Export", "--outdir", str(out.resolve()), str(source.resolve())],
                capture_output=True, text=True, timeout=180)
        except subprocess.TimeoutExpired:
            raise ValueError("LibreOffice superó el límite de 180 segundos.")
    target = out / (source.stem + ".pdf")
    if process.returncode != 0 or not target.is_file() or target.stat().st_size == 0:
        raise ValueError("LibreOffice no pudo convertir el documento. Comprueba que se puede abrir y no está protegido.")
    from pypdf import PdfReader
    if not PdfReader(target).pages:
        raise ValueError("LibreOffice produjo un PDF sin páginas.")
    return [str(target)]
