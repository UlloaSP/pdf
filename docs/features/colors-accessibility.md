# Accesibilidad del color

Herramienta local del workspace Colores. Contraste entre el color compartido y un fondo sRGB opaco, selección nativa y entrada HEX. Color.js 0.7.1 calcula WCAG21, la fórmula usada también por WCAG 2.2. Se compara el valor sin redondear con AA normal 4.5, AA grande 3, AAA normal 7 y AAA grande 4.5. La cifra visible se redondea a dos decimales.

Ocho muestras seleccionables. Las seis deficiencias cromáticas usan matrices Machado de severidad 1 o 0.5, aplicadas en RGB lineal, con recorte al gamut sRGB y codificación final. Acromatopsia usa luminancia lineal; acromatomalía mezcla esa luminancia al 50 %. Son aproximaciones para diseño, no diagnóstico ni representación universal de la percepción individual. Cumplir contraste no certifica toda la interfaz. No hay red, telemetría ni almacenamiento propio.

Fuentes: [tablas originales Machado, Oliveira y Fernandes](https://www.inf.ufrgs.br/~oliveira/pubs_files/CVD_Simulation/CVD_Simulation.html), [WCAG 2.2](https://www.w3.org/TR/WCAG22/#contrast-minimum), [API Color.js](https://colorjs.io/docs/contrast.html). Los coeficientes corresponden a las filas exactas 0.5 y 1.0 de la publicación.

Pruebas con vectores de referencia, umbrales sin redondeo, simetría, blanco/negro, los ocho modos y formulario React: selección de muestra e ingreso HEX inválido conserva el último fondo válido.
