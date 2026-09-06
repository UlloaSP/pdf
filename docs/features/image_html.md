# HTML a imagen

Captura un archivo HTML local o una URL HTTP/HTTPS en PNG o JPG usando Edge o Chrome instalado. El motor busca las ubicaciones habituales de Windows y el PATH. No instala ni descarga navegadores. Ejecuta el navegador sin ventana, con un perfil temporal propio y sin reutilizar sesiones del usuario.

Elige un archivo o una URL, ancho de 320–4096 px y alto de 200–8192 px, hasta 24 megapíxeles. La captura incluye el área visible definida por esas dimensiones; no cose automáticamente una página larga. Se ejecutan CSS y JavaScript; el tiempo virtual configurable no garantiza que una aplicación remota haya terminado todas sus peticiones. Las páginas pueden requerir Internet y las páginas con acceso restringido no heredan tu sesión. No exporta SVG ni certifica códigos HTTP: un navegador puede representar también una página de error.

El comando usa argumentos separados, sin shell, con timeout de 45 segundos. Las pruebas unitarias simulan únicamente la frontera del navegador y verifican imágenes reales, originales intactos, rutas con espacios, opciones inválidas y errores. Se requiere una comprobación adicional con el navegador instalado para validar el renderizado real.

Referencia: [Chrome Headless](https://developer.chrome.com/docs/automation-and-testing/headless) y su interfaz de captura `--screenshot`/`--window-size`.

Se comprobó el renderizado local con Chrome instalado: HTML con CSS a 640 × 480, dimensiones exactas y color de fondo esperado. En timeout se termina el árbol del navegador en Windows antes de eliminar el perfil temporal.
