"""Bundle the local Python runtime for the Windows MSI."""
from pathlib import Path
import shutil
import subprocess
import sys

root = Path(__file__).resolve().parent.parent
engine = root / "engine"
feature_imports = [
    argument
    for module in sorted((engine / "features").glob("*.py"))
    if not module.name.startswith("_")
    for argument in ("--hidden-import", f"features.{module.stem}")
]
subprocess.run([
    sys.executable, "-m", "PyInstaller", "--noconfirm", "--clean", "--onefile",
    "--name", "pdf-worker", "--paths", str(engine),
    *feature_imports, "--collect-all", "pypdfium2",
    "--collect-all", "pypdfium2_raw", "--copy-metadata", "pypdfium2",
    "--distpath", str(engine / "dist"), "--workpath", str(engine / "build"),
    "--specpath", str(engine / "build"), str(engine / "worker.py"),
], cwd=root, check=True)
target = root / "src-tauri" / "binaries"
target.mkdir(exist_ok=True)
shutil.copy2(engine / "dist" / "pdf-worker.exe", target / "pdf-worker-x86_64-pc-windows-msvc.exe")
