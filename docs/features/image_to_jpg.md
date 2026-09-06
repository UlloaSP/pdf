# Convertir a JPG

Conversión integrada con Pillow. Cada fotograma GIF, WEBP o página TIFF produce un JPG separado en orden de entrada. PSD usa exclusivamente la imagen compuesta disponible, no exporta capas. Transparencia sobre blanco, orientación EXIF aplicada; no se conserva metadata ni se promete gestión de color ICC. Límites: 100 entradas, 200 fotogramas y 40 millones de píxeles acumulados por entrada. Archivos de salida exclusivos, originales intactos.

SVG, HEIC y RAW no se admiten. [Formatos documentados por Pillow](https://pillow.readthedocs.io/en/stable/handbook/image-file-formats.html). Tests con imágenes generadas verifican transparencia, animación, orientación, límites y conservación de originales; PSD compuesto depende del decodificador de Pillow.
