# Formularios PDF

Crea campos de texto y casillas con una lista JSON. Cada campo define nombre, página, posición y dimensiones en puntos desde la esquina inferior izquierda del área visible. Los nombres deben ser únicos. El modo crear requiere un PDF sin formulario existente y admite texto Windows-1252.

El modo rellenar conserva los campos existentes. Usa texto para campos de texto y true/false para casillas. No admite XFA, botones de radio, firmas ni creación sobre formularios existentes. No detecta formularios escaneados. Los nombres disponibles aparecen en el error al solicitar un campo inexistente.

Pruebas con documentos ReportLab: relleno, creación con contenido original conservado, casilla activada, rechazo de campos fuera de página y entrada inválida.
