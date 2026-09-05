# Censurar PDF

Todas las páginas se convierten en imágenes nuevas. Las regiones elegidas se pintan en negro sobre los píxeles antes de crear la salida. No se copian texto, objetos, adjuntos, formularios ni metadatos originales. Se pierde texto seleccionable, enlaces y firmas. Las coordenadas son puntos sobre la página visible desde arriba a la izquierda. El usuario debe abarcar todo el contenido sensible y revisar visualmente la salida.

Pruebas: `python -m unittest discover -s engine/tests -p test_redact.py -v`.
