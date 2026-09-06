# Eliminar fondo

Motor opcional: instalación independiente de rembg CLI y un modelo U2NET ONNX ya presente. No está integrado en el worker Python 3.14; rembg documenta actualmente Python >=3.11 y <3.14. El usuario proporciona `rembg.exe` o lo instala en PATH y señala el archivo del modelo. No instalamos ni descargamos dependencias automáticamente.

Usa `rembg i -m u2net_custom -x` con `model_path` absoluto. Esta sesión carga la ruta local directamente, sin descargar modelos. Valida archivo ejecutable, extensión .onnx y tamaño de 1 byte a 2 GB; rembg/ONNX Runtime valida el contenido y compatibilidad del modelo. Solo U2NET personalizado compatible, no modelos ONNX arbitrarios. Sin shell y con timeout de 180 segundos; ventanas auxiliares ocultas en Windows.

Una imagen estática de hasta 16 millones de píxeles, orientación EXIF aplicada. El modelo recibe una copia temporal PNG y produce PNG con alfa; se comprueban formato y dimensiones. Limpia temporales, conserva originales y rechaza salida existente. La calidad del recorte depende del modelo y la fotografía. No hay conexión a servicios en este recorrido. No se reclama inferencia real probada si no está instalado el modelo.

Tests generan imágenes reales y simulan únicamente la frontera subprocess. Verifican parámetros, orientación, resultado alfa, limpieza, fallos, timeout, rutas ausentes, límites y originales intactos. Inferencia con rembg real queda pendiente de una instalación externa compatible.

Fuentes oficiales: [CLI rembg](https://github.com/danielgatis/rembg#usage-as-a-cli), [sesión U2NET personalizada](https://github.com/danielgatis/rembg/blob/main/rembg/sessions/u2net_custom.py).
