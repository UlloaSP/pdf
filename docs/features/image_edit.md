# Editor de imágenes

Ajusta color, añade texto, bordes o una pegatina. Salida PNG; sin edición por IA.

Ajustes de color deterministas, efectos gris/sepia/invertir, texto Latin-1 y pegatina local redimensionada con proporciones conservadas. Las posiciones se miden desde arriba a la izquierda antes del borde. No hay capas editables ni IA. No conserva animaciones ni metadatos.

Entrada máxima de 40 megapíxeles y 20.000 px por lado. Aplica EXIF y procesa el primer fotograma. Salida PNG con nombre único y sin alterar originales. Tests con imágenes generadas verifican píxeles, orientación, límites y errores.
