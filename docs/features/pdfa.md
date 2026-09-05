# PDF a PDF/A

Invoca Ghostscript en modo PDF/A-2b, con política de error ante incompatibilidades y perfil ICC RGB explícito. Comprueba la declaración XMP resultante. Esta comprobación no certifica conformidad: se requiere veraPDF para archivo oficial. No se ha ejecutado Ghostscript real en este equipo; las pruebas cubren ausencia, fallo y respuesta del proceso. Ghostscript se instala aparte, no se redistribuye.

Pruebas: `python -m unittest discover -s engine/tests -p test_pdfa.py -v`.
