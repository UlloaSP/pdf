# Contrato de utilidades

Cada utilidad aporta tres archivos propios: `src/features/<id>.json`, `engine/features/<id>.py` y `engine/tests/test_<id>.py`. Puede añadir documentación en `docs/features/<id>.md`. No modifica registros compartidos.

El JSON tiene `id`, `name`, `description`, `category` (Páginas, Conversión, Edición, Seguridad o Avanzadas), `extensions` (sin punto), `multiple` (boolean), `fields` (lista) y `requirements` (lista de dependencias externas, vacía para las integradas). Cada campo tiene `key`, `label`, `type` (text, number, select, checkbox, password o textarea), `default` opcional y `options` para select como lista de strings. Los inputs de archivo se seleccionan en el formulario común; las rutas adicionales se expresan como texto por ahora.

Cada módulo Python expone `run(inputs: list[str], output_dir: str, options: dict) -> list[str]`. Escribe únicamente dentro del directorio de salida recibido y devuelve las rutas de los resultados. Lanza ValueError con un mensaje claro para entradas inválidas. El runner valida existencia, evita sobrescribir originales y crea un directorio de trabajo único. Cada módulo valida sus opciones y cardinalidad. No ejecutes shell=True. Los procesos externos deben tener timeout y comprobar returncode. Imports opcionales dentro de run para no impedir arrancar otras utilidades.

Dependencias integradas: pypdf, pypdfium2, Pillow, reportlab, python-docx, python-pptx, openpyxl. Usa unittest con PDFs temporales generados por reportlab o pypdf. LibreOffice, Ghostscript, Tesseract y Ollama son motores externos opcionales, detectados con shutil.which o mediante conexión explícita; no se descargan automáticamente. Nada de PyMuPDF/fitz por ahora. Funciones avanzadas deben describir alcance real, sin prometer fidelidad no probada.

El backend Rust ejecutará un worker Python empaquetado con PyInstaller y pasará JSON por stdin: `{feature, inputs, output_dir, options}`. El worker responderá JSON `{ok, outputs, error}`. Los nombres de módulos se validan contra una lista de archivos local; la UI nunca elige comandos ejecutables.
