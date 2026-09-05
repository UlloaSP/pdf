"""Convert through Ghostscript PDF/A-2b with an explicit RGB output profile."""
from pathlib import Path
import shutil
import subprocess
import tempfile
from pypdf import PdfReader


def run(inputs, output_dir, options):
    if len(inputs) != 1:
        raise ValueError("Selecciona un PDF.")
    executable = next((path for name in ("gswin64c", "gswin32c", "gs") if (path := shutil.which(name))), None)
    if not executable:
        raise ValueError("Instala Ghostscript y añade gswin64c al PATH.")
    profile = Path(str(options.get("icc_profile", ""))).expanduser()
    if not profile.is_file():
        raise ValueError("Selecciona la ruta de un perfil ICC RGB, por ejemplo default_rgb.icc de Ghostscript.")
    data = profile.read_bytes()
    if len(data) < 128 or data[16:20] != b"RGB " or data[36:40] != b"acsp":
        raise ValueError("El archivo debe ser un perfil ICC RGB válido.")
    target = Path(output_dir) / "archivo-pdfa-2b.pdf"
    try:
        with tempfile.TemporaryDirectory(dir=output_dir, prefix="pdfa-") as work:
            # Use fixed ASCII names in a private working directory, never interpolate user paths into PostScript.
            Path(work, "profile.icc").write_bytes(data)
            definition = Path(work, "definition.ps")
            definition.write_text('''%!PS
[/_objdef {icc_PDFA} /type /stream /OBJ pdfmark
[{icc_PDFA} << /N 3 >> /PUT pdfmark
[{icc_PDFA} (profile.icc) (r) file /PUT pdfmark
[/_objdef {OutputIntent_PDFA} /type /dict /OBJ pdfmark
[{OutputIntent_PDFA} << /Type /OutputIntent /S /GTS_PDFA1 /DestOutputProfile {icc_PDFA} /OutputConditionIdentifier (RGB) >> /PUT pdfmark
[{Catalog} << /OutputIntents [ {OutputIntent_PDFA} ] >> /PUT pdfmark
''', encoding="ascii")
            result = subprocess.run([executable, "-dSAFER", "--permit-file-read=profile.icc", "-dBATCH", "-dNOPAUSE", "-sDEVICE=pdfwrite", "-dPDFA=2", "-dPDFACompatibilityPolicy=2", "-sColorConversionStrategy=RGB", "-sOutputICCProfile=profile.icc", f"-sOutputFile={target.resolve()}", str(definition), str(Path(inputs[0]).resolve())], cwd=work, capture_output=True, text=True, timeout=300, creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
            if result.returncode or not target.is_file():
                raise ValueError("Ghostscript no ha podido convertir a PDF/A-2b. " + result.stderr[-500:])
    except subprocess.TimeoutExpired as exc:
        raise ValueError("Ghostscript ha superado 300 segundos.") from exc
    reader = PdfReader(target)
    metadata = reader.xmp_metadata
    if not metadata or str(metadata.pdfaid_part) != "2" or str(metadata.pdfaid_conformance).upper() != "B":
        target.unlink(missing_ok=True)
        raise ValueError("El resultado no declara PDF/A-2b. No se entrega como archivo PDF/A.")
    note = Path(output_dir) / "validacion-pdfa.txt"
    note.write_text("Convertido con Ghostscript a PDF/A-2b y declaración XMP comprobada. La conformidad completa no está certificada: valida con veraPDF antes de archivarlo oficialmente.\n", encoding="utf-8")
    return [str(target), str(note)]
