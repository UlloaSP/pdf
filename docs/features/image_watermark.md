# Marca de agua en imágenes

Superpone texto o una imagen con opacidad y posición. Salida PNG.

Texto Latin-1 o imagen local, cinco posiciones, proporciones conservadas y transparencia multiplicada por la opacidad elegida. No repetición en mosaico ni detección del contenido. No conserva animaciones ni metadatos.

Entrada máxima de 40 megapíxeles y 20.000 px por lado. Aplica EXIF y procesa el primer fotograma. Salida PNG con nombre único y sin alterar originales. Tests con imágenes generadas verifican píxeles, orientación, límites y errores.
