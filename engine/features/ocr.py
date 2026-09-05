from contextlib import closing
"""Create a searchable image PDF through an installed Tesseract executable."""
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import pypdfium2 as pdfium
from pypdf import PdfReader, PdfWriter


def run(inputs, output_dir, options):
    if len(inputs) != 1:
        raise ValueError("Selecciona un PDF.")
    language = options.get("language", "eng")
    if not isinstance(language, str) or not re.fullmatch(r"[a-zA-Z0-9_]+(?:\+[a-zA-Z0-9_]+)*", language):
        raise ValueError("Idioma Tesseract inválido; ejemplos: spa, eng, spa+eng.")
    executable = shutil.which("tesseract")
    if not executable:
        raise ValueError("Instala Tesseract y sus idiomas y añade tesseract al PATH.")
    target = Path(output_dir) / "ocr.pdf"
    writer = PdfWriter()
    try:
        with tempfile.TemporaryDirectory(dir=output_dir, prefix="ocr-") as work:
            with pdfium.PdfDocument(inputs[0]) as document:
                if not len(document):
                    raise ValueError("El PDF no tiene páginas.")
                for index in range(len(document)):
                    with closing(document[index]) as page:
                        with closing(page.render(scale=300 / 72)) as bitmap:
                            image = bitmap.to_pil().convert("RGB")
                        image_path = Path(work) / f"page-{index}.png"
                        image.save(image_path, dpi=(300, 300))
                    base = Path(work) / f"recognized-{index}"
                    result = subprocess.run([executable, str(image_path), str(base), "-l", language, "--dpi", "300", "pdf"], capture_output=True, text=True, timeout=180, creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
                    if result.returncode or not base.with_suffix(".pdf").is_file():
                        raise ValueError("Tesseract no ha podido reconocer la página. Comprueba los idiomas instalados. " + result.stderr[-500:])
                    writer.append(PdfReader(base.with_suffix(".pdf")))
            writer.write(target)
    except subprocess.TimeoutExpired as exc:
        raise ValueError("Tesseract ha superado 180 segundos en una página.") from exc
    return [str(target)]
