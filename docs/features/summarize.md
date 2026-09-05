# Resumir PDF con IA

Extrae texto y resume fragmentos consecutivos de hasta 8.000 caracteres. Admite como máximo 100.000 caracteres y entrega Markdown. Requiere un modelo local previamente instalado. Solo conecta con 127.0.0.1:11434 y rechaza nombres cloud. El usuario es responsable de configurar el servicio como local. No descarga modelos ni hace OCR. La precisión depende del modelo: revisar hechos. Las pruebas simulan la respuesta HTTP; no se ha medido la calidad de ningún modelo.

Pruebas: `python -m unittest discover -s engine/tests -p test_summarize.py -v`.
