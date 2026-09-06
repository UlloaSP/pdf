# Pixelar o difuminar

Oculta regiones elegidas por coordenadas. No detecta caras u objetos automáticamente.

Las regiones son manuales, en píxeles desde arriba a la izquierda tras aplicar orientación EXIF. Pixelado por bloques o desenfoque gaussiano. No detección automática ni IA. El usuario debe cubrir toda la zona sensible y revisar el resultado; pixelar o difuminar no garantiza anonimización. No conserva animaciones ni metadatos.

Entrada máxima de 40 megapíxeles y 20.000 px por lado. Aplica EXIF y procesa el primer fotograma. Salida PNG con nombre único y sin alterar originales. Tests con imágenes generadas verifican píxeles, orientación, límites y errores.
