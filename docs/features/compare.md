# Comparar PDF

Compara renderizados a 72 ppp y produce HTML local, JSON y PNG por página. Cada imagen muestra original, nuevo y diferencia. Detecta páginas añadidas y tamaños distintos. No compara texto invisible, metadatos ni estructura; los cambios inferiores a la resolución pueden pasar inadvertidos.

Pruebas: `python -m unittest discover -s engine/tests -p test_compare.py -v`.
