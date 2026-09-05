# Recortar PDF

Reduce el área visible por márgenes; no borra contenido oculto.

El recorte modifica CropBox. El contenido fuera del recorte sigue recuperable; no sirve para censurar datos.

Validación: unittest con PDF de tres páginas generado por ReportLab; comprueba resultado y rechazo de entradas inválidas.

Rechaza páginas rotadas con anotaciones para evitar descolocar enlaces o campos al normalizar el giro.
