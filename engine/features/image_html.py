"""Render a chosen HTML file or URL with an installed headless Chromium browser."""
import math
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
from urllib.parse import urlsplit

from PIL import Image


def browser_path():
    for name in ("msedge", "chrome", "google-chrome", "chromium"):
        found = shutil.which(name)
        if found:
            return found
    for root in ("PROGRAMFILES", "PROGRAMFILES(X86)", "LOCALAPPDATA"):
        if not os.environ.get(root):
            continue
        for relative in ("Microsoft/Edge/Application/msedge.exe", "Google/Chrome/Application/chrome.exe"):
            candidate = Path(os.environ[root]) / relative
            if candidate.is_file():
                return str(candidate)
    raise ValueError("Instala Microsoft Edge o Google Chrome para capturar HTML.")


def integer(options, key, default, low, high):
    try:
        value = float(options.get(key, default))
    except (TypeError, ValueError):
        raise ValueError(f"{key}: introduce un número entero.") from None
    if not math.isfinite(value) or not value.is_integer() or not low <= value <= high:
        raise ValueError(f"{key}: debe estar entre {low} y {high}.")
    return int(value)


def capture(command):
    flags = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
    process = subprocess.Popen(command, shell=False, stdout=subprocess.DEVNULL,
                               stderr=subprocess.DEVNULL, creationflags=flags)
    try:
        return process.wait(timeout=45)
    except subprocess.TimeoutExpired:
        if os.name == "nt":
            try:
                subprocess.run(["taskkill", "/PID", str(process.pid), "/T", "/F"],
                               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                               shell=False, timeout=10, creationflags=flags)
            finally:
                if process.poll() is None:
                    process.kill()
                process.wait(timeout=10)
        else:
            process.kill()
            process.wait(timeout=10)
        raise


def run(inputs, output_dir, options):
    url = str(options.get("url", "")).strip()
    if len(inputs) > 1 or bool(inputs) == bool(url):
        raise ValueError("Selecciona un HTML o escribe una URL, no ambos.")
    if inputs:
        source = Path(inputs[0]).resolve()
        if not source.is_file() or source.suffix.lower() not in (".html", ".htm"):
            raise ValueError("Selecciona un archivo HTML local.")
        if source.stat().st_size > 10_000_000:
            raise ValueError("El HTML supera 10 MB.")
        url = source.as_uri()
    else:
        try:
            parsed = urlsplit(url)
            valid = (parsed.scheme in ("https", "http") and parsed.hostname
                     and not parsed.username and not parsed.password)
            _ = parsed.port
        except ValueError:
            valid = False
        if not valid or len(url) > 8192 or any(ord(c) < 32 for c in url):
            raise ValueError("Introduce una URL HTTP o HTTPS sin credenciales.")
    width = integer(options, "width", 1280, 320, 4096)
    height = integer(options, "height", 900, 200, 8192)
    wait_ms = integer(options, "wait_ms", 1000, 0, 10000)
    if width * height > 24_000_000:
        raise ValueError("La captura no puede superar 24 megapíxeles.")
    file_format = options.get("format", "PNG")
    if file_format not in ("PNG", "JPG"):
        raise ValueError("Elige PNG o JPG.")
    browser = browser_path()
    destination = Path(output_dir).resolve()
    destination.mkdir(parents=True, exist_ok=True)
    target = destination / ("pagina.png" if file_format == "PNG" else "pagina.jpg")
    if target.exists():
        raise ValueError("La imagen de destino ya existe.")
    # A private profile prevents reusing the user's signed-in browser session.
    with tempfile.TemporaryDirectory(prefix="html-capture-", dir=destination) as temporary:
        screenshot = Path(temporary) / "capture.png"
        command = [browser, "--headless=new", "--disable-gpu", "--no-first-run",
                   "--disable-background-networking", "--disable-extensions", "--disable-sync",
                   "--no-default-browser-check", "--hide-scrollbars", "--force-device-scale-factor=1",
                   f"--user-data-dir={Path(temporary) / 'profile'}", f"--window-size={width},{height}",
                   f"--virtual-time-budget={wait_ms}", f"--screenshot={screenshot}", url]
        try:
            returncode = capture(command)
        except subprocess.TimeoutExpired:
            raise ValueError("El navegador tardó más de 45 segundos en capturar la página.") from None
        except OSError:
            raise ValueError("No se pudo iniciar el navegador para capturar HTML.") from None
        if returncode != 0 or not screenshot.is_file():
            raise ValueError("El navegador no pudo generar la captura.")
        with Image.open(screenshot) as image:
            if image.width * image.height > 24_000_000:
                raise ValueError("La captura generada supera el límite de píxeles.")
            image.load()
            with target.open("xb") as stream:
                image.convert("RGB").save(stream, format="PNG" if file_format == "PNG" else "JPEG", quality=90)
    return [str(target)]
