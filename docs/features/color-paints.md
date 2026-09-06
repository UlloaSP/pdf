# Pinturas

La herramienta admite catálogos JSON propios y conexión opcional a la [API de Encycolorpedia](https://api.encycolorpedia.com/doc). No incluye una copia de su catálogo comercial.

## Catálogo local

Importar una lista de objetos `{"brand":"Marca","name":"Nombre","hex":"#635dd7"}`. Hasta 10.000 entradas y 2 MB; se validan todos los elementos antes de sustituir los datos. Se guarda en localStorage y puede exportarse como JSON. Los errores de persistencia dejan los datos disponibles en memoria para exportarlos. La búsqueda ignora tildes y permite filtrar por marca. Las coincidencias se ordenan por CIEDE2000 calculado con Color.js, con umbral de 0 a 200. Se muestran 48 por página.

Los histogramas resumen matiz en intervalos de 30 grados y saturación/luminosidad HSL en intervalos de 10 %. Los grises se excluyen del histograma de matiz. Las equivalencias se basan en los valores sRGB proporcionados, sin caracterización espectral de pinturas físicas.

## API

El token se introduce en la vista Encycolorpedia y permanece exclusivamente en estado React. Se descarta al cerrar esa vista; no se guarda en localStorage, archivos, URL ni mensajes de error. Las peticiones tienen un límite de 20 segundos y 2 MB de respuesta; cambiar parámetros, cancelar o desmontar descarta las respuestas anteriores. Se rechazan redirecciones.

Operaciones del [OpenAPI oficial](https://api.encycolorpedia.com/v1/spec.json), examinado el 6 de septiembre de 2026:

- Pro: GET `/v1/paints` y `/v1/paints/{brand}/profile`.
- Enterprise: POST `/v1/paints`, búsqueda por marca y búsqueda general con filtros, idioma español y desplazamiento. La búsqueda admite las expresiones que soporte el servicio, incluidas consultas de páginas e imágenes según su ayuda.
- User: POST `/v1/colors`, conversiones adicionales del servicio.

Las marcas y coincidencias con el esquema Paint/Match documentado tienen muestras seleccionables. La respuesta completa se muestra y descarga como JSON, conservando perfiles, resultados de búsqueda y conversiones especializadas aunque su estructura no disponga de una representación visual local. La respuesta de búsqueda por marca no tiene esquema de salida definido en OpenAPI.

Se verificó CORS desde localhost y manejo de respuestas simuladas. **No se han validado consultas autenticadas con una cuenta Pro/Enterprise**: no se dispone de token. Un token de prueba inválido produjo HTTP 500 en el servicio; se muestra como error sin inferir que no existan colores. Cuotas y autorización de redistribución del catálogo no están documentadas en la especificación examinada.

Pruebas: validación de importación, duplicados/límites, orden y umbral de coincidencias, histogramas de colores límite, URLs y payloads, validación de marcas y errores 401/403/429/500/JSON/tamaño.
