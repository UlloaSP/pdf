"""Exercise the packaged executable, including its frozen module registry."""
import json
from pathlib import Path
import subprocess
import tempfile
from pypdf import PdfWriter, PdfReader

root = Path(__file__).resolve().parent.parent
executable = root / "src-tauri/binaries/pdf-worker-x86_64-pc-windows-msvc.exe"
with tempfile.TemporaryDirectory() as temp:
    folder = Path(temp)
    first = folder / "entrada.pdf"
    writer = PdfWriter()
    writer.add_blank_page(width=300, height=400)
    writer.write(first)
    # Infrastructure PR has no utility modules yet. Once merge lands this becomes
    # an end-to-end successful operation through the frozen worker.
    available = (root / "engine/features/merge.py").is_file()
    request = {"feature": "merge" if available else "unknown", "inputs": [str(first), str(first)], "output_dir": str(folder), "options": {}}
    before = first.read_bytes()
    process = subprocess.run([str(executable)], input=json.dumps(request).encode(), capture_output=True, timeout=60)
    assert process.returncode == 0, process.stderr.decode(errors="replace")
    response = json.loads(process.stdout)
    assert response["ok"] == available, response
    if available:
        assert len(PdfReader(response["outputs"][0]).pages) == 2
    assert first.read_bytes() == before, "Original modified"
    print("Packaged worker smoke passed", "merge" if available else "registry validation")
