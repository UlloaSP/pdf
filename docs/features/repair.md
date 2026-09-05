# Reparar PDF

Reescribe objetos recuperables con el lector tolerante de pypdf. Prueba una referencia startxref dañada. No reconstruye bytes ausentes ni garantiza recuperar PDFs gravemente corruptos.

Pruebas: `python -m unittest discover -s engine/tests -p test_repair.py -v`.
