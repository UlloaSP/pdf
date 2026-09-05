# Traducir PDF

Traduce texto extraído por fragmentos de hasta 6.000 caracteres, hasta 100.000 en total. Produce TXT y PDF con maquetación nueva. No conserva tablas, imágenes, saltos originales ni firmas. Usa Arial de Windows o Vera como alternativa, o una TTF del usuario; rechaza glifos ausentes. Escrituras que requieren composición compleja como árabe no tienen fidelidad de composición garantizada. Solo conecta a loopback y rechaza nombres cloud. No descarga modelos. Las pruebas simulan HTTP y validan texto real en el PDF generado; no evalúan calidad lingüística.

Pruebas: `python -m unittest discover -s engine/tests -p test_translate.py -v`.
