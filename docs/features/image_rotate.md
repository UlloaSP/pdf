# Rotar imágenes

Gira 90°, 180° o 270° en sentido horario, después de normalizar EXIF. Puede seleccionar solo imágenes horizontales o verticales. Conserva GIF animado.

Admite JPG, PNG estático de 8 bits y GIF. No admite SVG, APNG ni PNG de 16 bits. Normaliza EXIF antes de operar y omite después EXIF, GPS y comentarios. Conserva ICC y DPI en JPG/PNG. JPG se recodifica con pérdida; las animaciones GIF conservan tiempos y bucle con una paleta de hasta 255 colores opacos más transparencia, que puede variar respecto al original. Los fotogramas consecutivos idénticos pueden combinarse manteniendo la duración.

Límites: 100 archivos por trabajo, 16 millones de píxeles por fotograma, 32 millones acumulados por animación y 200 fotogramas. Cada salida incluye un índice para evitar colisiones. Los originales no se modifican. La compresión no garantiza reducir todos los archivos.

[Referencia de formatos Pillow](https://pillow.readthedocs.io/en/stable/handbook/image-file-formats.html). Pruebas con imágenes generadas, colores, dimensiones, EXIF, ICC, animación y entradas inválidas.
