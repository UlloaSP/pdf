# Extraer colores de una imagen

Procesamiento local en Canvas, sin motores externos, subida, URLs remotas ni almacenamiento de la imagen. Admite PNG, JPEG y WEBP estáticos. Rechaza GIF, SVG y cabeceras de animación APNG/WEBP. Antes de decodificar comprueba firma, dimensiones y límites de 15 MiB, 12 megapíxeles y 16384 píxeles por lado. El decodificador del navegador valida el contenido completo. Aplica orientación EXIF al decodificar y lee píxeles sRGB del canvas, que pueden diferir de los valores codificados por gestión de color o redondeo del navegador.

Paleta de hasta ocho grupos: imagen reducida al lado máximo 256, histograma de 5 bits por canal y promedio ponderado por alfa. Descarta transparencia completa. No usa IA ni clustering perceptual. Los porcentajes representan el peso en la muestra, no una medición exacta del área original; se muestran solo los grupos principales.

El cuentagotas lee el lienzo a resolución original. Ratón selecciona; flechas desplazan un píxel, Shift diez, Enter o espacio usa el RGB del píxel. La opacidad se informa por separado porque el color compartido es opaco. No selecciona píxeles completamente transparentes. Exporta únicamente colores y proporciones en JSON o variables CSS, sin archivo ni nombre original.

Una carga a la vez. Se liberan el bitmap y canvas temporal, se borra el canvas previo al reemplazar y se descartan resultados que lleguen después del desmontaje. Exportación Blob revocada después de iniciar descarga. No se ejecuta código de archivos; formatos activos como SVG están excluidos.

Pruebas de cabeceras con imágenes reales generadas por Pillow, rechazos antes de decodificar, cuantización/alfa, coordenadas, exportación y componente React con Canvas/decodificador simulados en su frontera. [Canvas HTML](https://html.spec.whatwg.org/multipage/canvas.html), [ImageBitmap](https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html).
