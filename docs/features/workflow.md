# Crear un flujo

Ejecuta de 1 a 20 pasos, cada uno en una carpeta propia. Solo importa módulos registrados y rechaza flujos anidados. Cada paso recibe todos los archivos del anterior; el usuario debe encadenar utilidades compatibles. Comprueba que las salidas existen dentro de la carpeta del paso. Guarda un manifiesto sin opciones ni contraseñas. El JSON de pasos se puede copiar y reutilizar; no hay editor visual. Si un paso falla, el worker elimina la carpeta del trabajo completo; no se entregan resultados parciales.

Pruebas: `python -m unittest discover -s engine/tests -p test_workflow.py -v`.
