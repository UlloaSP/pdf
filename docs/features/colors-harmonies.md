# Armonías y paletas

Herramienta local `harmonies`. Seis armonías desplazan el ángulo HSL: complementario 180°, análogos ±30°, dividido 150°/210°, tríada 120°/240°, cuadrado 90°/180°/270° y tetrádica 60°/180°/240°. Las variaciones monocromáticas recorren luminosidad o saturación. Los colores sin matiz usan 0° cuando se aumenta la saturación; una armonía de gris permanece gris.

Sombras, tintas y tonos mezclan el color con negro, blanco y gris #808080, respectivamente, en sRGB. No representan mezclas físicas de pigmentos. Los degradados interpolan con Color.js en Oklab o sRGB codificado, con 2 a 20 pasos e inclusión de ambos extremos. Los resultados se recortan a sRGB y redondean a HEX de 8 bits. [Referencia de interpolación](https://colorjs.io/docs/interpolation).

Cada muestra cambia el color compartido. La herramienta genera colores aleatorios, copia o descarga la paleta actual en JSON o variables CSS y muestra el texto como alternativa al portapapeles. Un degradado con un número de pasos inválido muestra una vista de 7 pasos y explica el valor empleado.

Las paletas guardadas usan `pdf-utils.color-palettes.v1` en localStorage: máximo 20 paletas, 20 colores por paleta y nombres de 64 caracteres. Se validan al leer y escribir; datos corruptos no se sobrescriben automáticamente. La herramienta permite cargar y eliminar paletas, pero no sincroniza entre equipos ni importa archivos. El color compartido y la paleta cargada son independientes: pulsar una muestra actualiza el color sin modificar la colección guardada. Los ajustes de generación se reinician al salir de la herramienta.

Las pruebas verifican ángulos conocidos, grises, negro, blanco, conversiones de ida y vuelta, extremos de gradientes, límites, exportación y errores de almacenamiento. El procesamiento no envía colores a servicios externos.
