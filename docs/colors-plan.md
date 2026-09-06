# Biblioteca Colores

La biblioteca comparte un color sRGB y ofrece herramientas interactivas React, sin ejecutar el worker de documentos. El selector y el campo HEX funcionan también en navegador. Cada módulo se integra por su propia rama y PR; la infraestructura muestra solo módulos presentes, sin tarjetas que prometan funciones pendientes.

| Módulo previsto | Alcance | Dependencias y límites |
|---|---|---|
| inspector | Conversiones de color, vista de muestra y valores copiables. | Cálculos locales. Los valores de impresión requieren declarar espacio y condiciones, sin prometer una pintura física exacta. |
| harmonies | Complementarios, análogos, tríadas y variaciones. | Cálculos locales; indicar el modelo utilizado. |
| accessibility | Contraste de texto y simulaciones de percepción de color. | Cálculos locales; una simulación no sustituye una evaluación humana. |
| extract | Colores dominantes de una imagen elegida por el usuario. | Procesamiento local, límites explícitos de tamaño y formatos; no subir imágenes automáticamente. |
| paints | Catálogo y búsqueda de pinturas, aproximaciones entre colores y marcas. | Un catálogo completo necesita datos autorizados o acceso a una API externa. No presentar muestras como catálogo completo. |

## Referencia y datos

Se examinó [Encycolorpedia Pinturas](https://encycolorpedia.es/paints), una [ficha de marca](https://encycolorpedia.es/paints/1829), una [ficha de color](https://encycolorpedia.es/d9abab), [Ayuda](https://encycolorpedia.es/help) y la [API oficial](https://api.encycolorpedia.com/doc) el 6 de septiembre de 2026. La referencia permite comparar pinturas con diferencia ΔE, consultar distribuciones HSL de marcas, conversiones, armonías y búsquedas por componentes y texto. La paridad completa no queda cubierta por estas cinco primeras herramientas.

La API documenta autenticación Bearer, marcas y perfiles en nivel Pro, y búsqueda/equivalencia de pinturas en Enterprise. Su [OpenAPI](https://api.encycolorpedia.com/v1/spec.json) declara `Unlicensed`: no se encontró autorización explícita para redistribuir todo el catálogo en un MSI. La [política de privacidad](https://encycolorpedia.es/privacy-policy) trata datos personales, no concede una licencia del catálogo. Quedan por confirmar condiciones de uso, redistribución y cuotas antes de incorporar esos datos. No se han comprado accesos ni descargado catálogos.

Los controles conservan los temas y tamaño de texto del usuario. El scroll pertenece al contenido de la app; búsqueda, atajos, ajustes y bloqueo durante instalación se comparten con PDF e Imágenes.
