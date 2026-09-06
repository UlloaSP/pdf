# Inspector y conversiones

Color.js 0.7.1 (MIT, tipos incluidos) realiza los cálculos localmente. El inspector muestra los tres componentes y sus rangos nativos para los **51 espacios registrados** por esa versión: RGB y variantes lineales, XYZ D50/D65/absoluto, Lab/LCH, Oklab/OKLCH y variantes, Luv/LCHuv/HSLuv/HPLuv, Okhsl/Okhsv, CAM16-JMh, HCT, Helmlab/HelmGen, ACES y espacios HDR. Los valores no se recortan al rango de referencia. Coordenadas indefinidas se muestran como —. Los modelos de apariencia y HDR usan las condiciones predeterminadas de la biblioteca, no mediciones del entorno.

## Entrada y edición

La biblioteca comparte sRGB opaco de 8 bits. Admite colores CSS que Color.js puede interpretar con componentes definidos: HEX, nombres, RGB, HSL, HWB, Lab, OKLab y `color(...)`. Rechaza transparencia, componentes `none`, variables, colores de sistema no resueltos y entradas inválidas. Al aplicar un color fuera de sRGB, avisa de la aproximación mediante el método CSS de Color.js; todos los valores posteriores corresponden al HEX resultante, no al color original de gama amplia. Los controles HSL permiten modificar matiz, saturación y luminosidad; saturar un gris sin matiz comienza en 0°.

## Representaciones adicionales

- 148 nombres CSS de la tabla distribuida por Color.js mediante `colorjs.io/src/keywords.js`, con alias exactos y nombre más cercano por ΔE2000. No son nombres comerciales de pinturas.
- Paleta websafe de 216 combinaciones: cada canal se redondea al múltiplo de 51 más cercano.
- Decimal RGB24, binario por canal, Android `#AARRGGBB` con alpha FF e int32 firmado; CSS copiable para texto, fondo, borde, variables, HSL, OKLCH, Lab y Display P3.
- CMY = 1 − RGB normalizado. CMYK: K = 1 − max(R,G,B); C/M/Y = (max − canal)/max, salvo negro, que usa 0/0/0/1. Son aproximaciones sin perfil ICC ni simulación de tintas.
- LRV aproximado = luminancia relativa sRGB × 100. No representa una medición de reflectancia de pintura.

## Cobertura de la referencia

Se cubren las conversiones anteriores, nombres CSS, websafe, códigos y ejemplos. RYB, TSL, Hunter Lab, CIECAM02, OSA-UCS, LMS y variantes YUV/YCbCr no se añaden: no son espacios registrados en esta versión y no se sustituyen por modelos distintos. No hay equivalencia física de pinturas, perfil de impresión configurable ni coincidencia espectral. El inspector no solicita datos de Encycolorpedia ni usa su catálogo.

## Fuentes y comprobación

[Color.js: espacios](https://colorjs.io/docs/spaces), [objeto Color](https://colorjs.io/docs/the-color-object), [gamut](https://colorjs.io/docs/gamut-mapping), [CSS: nombres](https://drafts.csswg.org/css-color-4/#named-colors), [Android Color](https://developer.android.com/reference/android/graphics/Color).

Pruebas del vector #635dd7, negro/blanco/gris, alias, gamut P3, entradas inválidas, conversión HSL y las 51 tablas de coordenadas. El portapapeles informa del error y conserva texto seleccionable si el navegador deniega su acceso.
