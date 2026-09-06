# Contrato de utilidades

Cada utilidad aporta tres archivos propios: `src/features/<id>.json`, `engine/features/<id>.py` y `engine/tests/test_<id>.py`. Puede añadir documentación en `docs/features/<id>.md`. No modifica registros compartidos.

El JSON tiene `id`, `name`, `description`, `category` (Páginas, Conversión, Edición, Seguridad o Avanzadas), `extensions` (sin punto), `multiple` (boolean), `fields` (lista) y `requirements` (lista de dependencias externas, vacía para las integradas). Cada campo tiene `key`, `label`, `type` (text, number, select, checkbox, password o textarea), `default` opcional y `options` para select como lista de strings. Los inputs de archivo se seleccionan en el formulario común; las rutas adicionales se expresan como texto por ahora.

Cada módulo Python expone `run(inputs: list[str], output_dir: str, options: dict) -> list[str]`. Escribe únicamente dentro del directorio de salida recibido y devuelve las rutas de los resultados. Lanza ValueError con un mensaje claro para entradas inválidas. El runner valida existencia, evita sobrescribir originales y crea un directorio de trabajo único. Cada módulo valida sus opciones y cardinalidad. No ejecutes shell=True. Los procesos externos deben tener timeout y comprobar returncode. Imports opcionales dentro de run para no impedir arrancar otras utilidades.

Dependencias integradas: pypdf, pypdfium2, Pillow, reportlab, python-docx, python-pptx, openpyxl. Usa unittest con PDFs temporales generados por reportlab o pypdf. LibreOffice, Ghostscript, Tesseract y Ollama son motores externos opcionales, detectados con shutil.which o mediante conexión explícita; no se descargan automáticamente. Nada de PyMuPDF/fitz por ahora. Funciones avanzadas deben describir alcance real, sin prometer fidelidad no probada.

El backend Rust ejecutará un worker Python empaquetado con PyInstaller y pasará JSON por stdin: `{feature, inputs, output_dir, options}`. El worker responderá JSON `{ok, outputs, error}`. Los nombres de módulos se validan contra una lista de archivos local; la UI nunca elige comandos ejecutables.

## Bibliotecas PDF e Imágenes

El campo opcional `workspace` indica `pdf` o `images`. Si falta, se interpreta como `pdf` para conservar las 32 utilidades originales, incluidas JPG a PDF y PDF a JPG. Las nuevas utilidades de imagen declaran `workspace: "images"`. `category` conserva su clasificación interna, pero ya no define la navegación de la sidebar.

Las imágenes usan el mismo runner y contrato de salida. Las pruebas generan imágenes con Pillow y verifican dimensiones, píxeles, transparencia, orientación y conservación de originales. Declara exactamente los formatos soportados y el tratamiento de animaciones. No prometas ampliación por IA o detección automática si el motor solo interpola o recibe regiones manuales. Los modelos externos deben existir localmente; no se descargan sin una acción explícita de instalación.

## Biblioteca Colores

Las herramientas de color interactivas usan un contrato distinto al runner de documentos. Cada `src/colors/tools/<id>.tsx` exporta por defecto un descriptor `ColorTool` de `src/colors/types.ts`: `{ id, name, description, order, Component }`. `Colors.tsx` descubre esos archivos con `import.meta.glob`, ordena por `order` e `id`, y permite buscar por nombre y descripción. El nombre de archivo y el identificador deben coincidir y ser únicos. Los helpers se colocan fuera de `tools/` para no registrarlos como utilidades.

`Component` recibe `ColorToolProps`: `{ color: string; onColorChange: (hex: string) => void }`. `color` siempre es sRGB `#rrggbb` válido en minúsculas. El callback acepta `#RGB` o `#RRGGBB`, normaliza el valor e ignora entradas inválidas. El valor inicial compartido es `#635dd7`. Cada módulo conserva sus opciones con estado React, se desmonta al cambiar de herramienta y no modifica App ni registros. Abrir Ajustes conserva el módulo montado. Se añaden pruebas propias en `tests/colors-<id>.test.tsx` o `.test.ts` y documentación en `docs/features/colors-<id>.md`.

La shell recibe `searchRef: Ref<HTMLInputElement>`, `query: string` y `onQueryChange: (value: string) => void` desde App. Los motores locales no requieren Python. Cualquier acceso externo debe ser explícito y documentado; no incorporar secretos o tokens en el código ni subir imágenes sin una acción informada del usuario. Consulta [plan de Colores](colors-plan.md) para alcance y datos pendientes.
