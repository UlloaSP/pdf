from pathlib import Path
import os
import subprocess

def acquire(target):
    if os.name != "nt":
        raise ValueError("La adquisición WIA solo está disponible en Windows.")
    script = "$ErrorActionPreference='Stop'; $dialog=New-Object -ComObject WIA.CommonDialog; $image=$dialog.ShowAcquireImage(1,1,0,'{B96B3CAB-0728-11D3-9D7B-0000F81EF32E}', $false, $true, $false); if ($null -eq $image) {exit 2}; $image.SaveFile($env:PDF_SCAN_TARGET)"
    env = os.environ.copy()
    env["PDF_SCAN_TARGET"] = str(target.resolve())
    try:
        result = subprocess.run(["powershell.exe", "-NoProfile", "-STA", "-Command", script], env=env, capture_output=True, timeout=180)
    except subprocess.TimeoutExpired:
        raise ValueError("La adquisición superó 180 segundos.")
    if result.returncode or not target.is_file():
        raise ValueError("Escaneo cancelado o dispositivo WIA no disponible.")

def run(inputs: list[str], output_dir: str, options: dict) -> list[str]:
    from PIL import Image, ImageOps
    mode = options.get("mode", "Importar captura")
    if mode not in ("Importar captura", "Escáner WIA"):
        raise ValueError("Modo de captura desconocido.")
    if mode == "Importar captura" and len(inputs) != 1:
        raise ValueError("Selecciona exactamente una captura.")
    if mode == "Escáner WIA" and inputs:
        raise ValueError("No selecciones archivos para usar el escáner WIA.")
    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)
    scanned = out / "wia-capture.bmp"
    if mode == "Escáner WIA":
        acquire(scanned)
        source = scanned
    else:
        source = Path(inputs[0])
    target = out / "scan.pdf"
    try:
        with Image.open(source) as image:
            converted = ImageOps.exif_transpose(image).convert("RGB")
            try:
                converted.save(target, "PDF", resolution=150)
            finally:
                converted.close()
    finally:
        if scanned.is_file():
            scanned.unlink()
    return [str(target)]
