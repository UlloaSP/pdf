# OCR PDF

Renderiza a 300 ppp y usa Tesseract para generar una capa de texto buscable por página. Reconstruye todo el documento y pierde formularios, enlaces y firmas. Requiere instalación externa de Tesseract y traineddata. Timeout 180 segundos por página. Las pruebas simulan solo la frontera del proceso; la calidad OCR real no se ha validado en este equipo.

Pruebas: `python -m unittest discover -s engine/tests -p test_ocr.py -v`.
