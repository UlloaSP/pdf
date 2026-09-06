# Entrega de utilidades PDF e imágenes

Las 45 utilidades están integradas en develop, con revisión independiente y CI aprobado antes de cada merge. main conserva la base inicial y la sincronización de CodeRabbit; esta entrega no publica una release de producto.

Seguimiento: la [PR #36](https://github.com/UlloaSP/pdf/pull/36) configura CodeRabbit para todos los destinos, incorpora la skill frontend-design de Claude y documenta el arranque local. La [PR #37](https://github.com/UlloaSP/pdf/pull/37) sincroniza exclusivamente el YAML con main. El esquema oficial valida la configuración; CodeRabbit la reconoce, pero sus límites de estrellas y cuota OSS impiden confirmar revisiones automáticas efectivas. El procedimiento de revisión sustituta está en `docs/gitflow.md`; los resultados de CI y los merges se consultan en cada PR.

Se han preparado 32 utilidades con formulario y motor local, cada una en su rama `feature/<id>` y su PR hacia `develop`. La interfaz usa React y TypeScript; Tauri/Rust ejecuta el worker Python empaquetado. Esta entrega ofrece los recorridos descritos abajo; no alcanza todavía todas las capacidades de la aplicación de referencia.

## Ramas y utilidades

La rama `feature/zen-shell` incorpora el [marco y navegación tipo Zen](zen-shell.md), con paneles superior e izquierdo que se ocultan automáticamente y una vista de herramientas sin los textos promocionales o de desarrollo.

La [PR #38](https://github.com/UlloaSP/pdf/pull/38) migra el frontend, los comandos Tauri y los workflows a Vite+ 0.3.0 con pnpm 11.1.3. La instalación congelada, lint, tipos y build web pasan localmente; se genera un MSI Windows x64, con instalación y desinstalación en una VM limpia aún pendientes; el servidor de desarrollo responde en el puerto 1420. `AGENTS.md` y el README conservan los nuevos comandos. CI y la revisión final quedan registrados en la PR.

Todas las ramas de esta tabla tienen el prefijo `feature/`. Todas las PRs enlazadas están fusionadas en develop mediante merge commit. Las ramas publicadas se conservan para inspección.

| Utilidad e ID | PR | Comportamiento disponible y límite principal |
|---|---|---|
| PDF a JPG · `pdf_to_jpg` | [#1](https://github.com/UlloaSP/pdf/pull/1) | Renderiza páginas a 72–300 DPI o extrae imágenes incrustadas a JPG; fondo blanco en transparencias. |
| Word a PDF · `word_to_pdf` | [#2](https://github.com/UlloaSP/pdf/pull/2) | Convierte DOC, DOCX y ODT con LibreOffice externo; fuentes y paginación pueden variar. |
| PowerPoint a PDF · `powerpoint_to_pdf` | [#3](https://github.com/UlloaSP/pdf/pull/3) | Convierte PPT, PPTX y ODP con LibreOffice externo. |
| Excel a PDF · `excel_to_pdf` | [#4](https://github.com/UlloaSP/pdf/pull/4) | Convierte XLS, XLSX y ODS con LibreOffice externo. |
| PDF a Word · `pdf_to_word` | [#5](https://github.com/UlloaSP/pdf/pull/5) | Extrae texto editable y separa páginas; no conserva imágenes, columnas ni maquetación. |
| PDF a PowerPoint · `pdf_to_powerpoint` | [#6](https://github.com/UlloaSP/pdf/pull/6) | Una diapositiva por página como imagen; el texto de esa imagen no es editable. |
| PDF a Excel · `pdf_to_excel` | [#7](https://github.com/UlloaSP/pdf/pull/7) | Exporta texto por página y divide columnas por espacios/tabuladores; no reconoce tablas gráficas ni fórmulas. |
| HTML a PDF · `html_to_pdf` | [#8](https://github.com/UlloaSP/pdf/pull/8) | Convierte texto de HTML local UTF-8; admite Windows-1252 y rechaza otros caracteres. Sin CSS, imágenes, JavaScript ni URL. |
| PDF a Markdown · `pdf_to_markdown` | [#9](https://github.com/UlloaSP/pdf/pull/9) | Extrae texto con separadores de página; no reconstruye estructura, tablas, imágenes ni enlaces. |
| Escanear a PDF · `scan` | [#10](https://github.com/UlloaSP/pdf/pull/10) | Importa una captura o adquiere una página con WIA de Windows; sin captura móvil ni alimentador multipágina validado. |
| Unir PDF · `merge` | [#12](https://github.com/UlloaSP/pdf/pull/12) | Combina documentos en el orden seleccionado y evita colisiones de nombres de formulario. |
| Dividir PDF · `split` | [#13](https://github.com/UlloaSP/pdf/pull/13) | Un archivo por página seleccionada; conserva campos AcroForm. Sin división por peso o marcadores. |
| Organizar PDF · `organize` | [#14](https://github.com/UlloaSP/pdf/pull/14) | Lista para reordenar, duplicar u omitir páginas; conserva AcroForm. Sin miniaturas ni inserción desde otro archivo. |
| Rotar PDF · `rotate` | [#15](https://github.com/UlloaSP/pdf/pull/15) | Gira la selección 90, 180 o 270 grados conservando contenido vectorial. |
| Recortar PDF · `crop` | [#16](https://github.com/UlloaSP/pdf/pull/16) | Ajusta el área visible por márgenes; el contenido oculto permanece recuperable. |
| Marca de agua · `watermark` | [#17](https://github.com/UlloaSP/pdf/pull/17) | Texto o imagen centrada, tamaño y opacidad configurables; texto Windows-1252. |
| Numerar páginas · `page_numbers` | [#18](https://github.com/UlloaSP/pdf/pull/18) | Numeración secuencial desde el valor elegido, centrada al pie. |
| Imagen a PDF · `jpg_to_pdf` | [#19](https://github.com/UlloaSP/pdf/pull/19) | Una página por imagen, tamaño por DPI, orientación EXIF y fondo blanco; primer fotograma de imágenes múltiples. |
| Editar PDF · `edit` | [#20](https://github.com/UlloaSP/pdf/pull/20) | Añade texto Windows-1252 por superposición; no reemplaza texto ni refluye párrafos. |
| Firma visible · `sign` | [#21](https://github.com/UlloaSP/pdf/pull/21) | Superpone nombre o imagen; no autentica identidad, no usa certificados y no solicita firmas remotas. |
| Formularios PDF · `forms` | [#22](https://github.com/UlloaSP/pdf/pull/22) | Crea texto/casillas mediante JSON en PDFs sin formulario o rellena campos existentes; sin XFA, radios ni detección de escaneos. |
| Comprimir PDF · `compress` | [#23](https://github.com/UlloaSP/pdf/pull/23) | Compresión sin pérdida; conserva copia del original si el resultado crece. No reduce resolución de imágenes. |
| Proteger PDF · `protect` | [#24](https://github.com/UlloaSP/pdf/pull/24) | Cifrado de apertura AES-256; rechaza documentos ya cifrados. |
| Desbloquear PDF · `unlock` | [#25](https://github.com/UlloaSP/pdf/pull/25) | Retira cifrado con contraseña válida; no realiza fuerza bruta. |
| Reparar PDF · `repair` | [#26](https://github.com/UlloaSP/pdf/pull/26) | Reescribe objetos recuperables con lector tolerante; no reconstruye bytes ausentes. |
| Comparar PDF · `compare` | [#27](https://github.com/UlloaSP/pdf/pull/27) | Comparación visual a 72 DPI con HTML, JSON y PNG; no compara metadatos ni texto invisible. |
| Censurar PDF · `redact` | [#28](https://github.com/UlloaSP/pdf/pull/28) | Pinta regiones antes de reconstruir todo el PDF como imágenes nuevas; pierde texto seleccionable, enlaces y formularios. |
| OCR PDF · `ocr` | [#29](https://github.com/UlloaSP/pdf/pull/29) | Tesseract externo añade texto buscable a páginas renderizadas a 300 DPI; reconstruye el documento. |
| PDF a PDF/A · `pdfa` | [#30](https://github.com/UlloaSP/pdf/pull/30) | Ghostscript externo genera PDF/A-2b con ICC RGB; comprobar XMP no certifica conformidad. |
| Resumir PDF · `summarize` | [#31](https://github.com/UlloaSP/pdf/pull/31) | Resume texto extraído con Ollama local a Markdown; hasta 100.000 caracteres, sin OCR automático. |
| Traducir PDF · `translate` | [#32](https://github.com/UlloaSP/pdf/pull/32) | Ollama local traduce texto y genera TXT/PDF con maquetación nueva; no conserva tablas ni imágenes. |
| Crear un flujo · `workflow` | [#33](https://github.com/UlloaSP/pdf/pull/33) | Encadena 1–20 pasos definidos en JSON; exige formatos compatibles, sin editor visual ni flujos anidados. |

La infraestructura y el Gitflow corresponden a [#11](https://github.com/UlloaSP/pdf/pull/11). Las instrucciones persistentes están en `AGENTS.md`, `docs/gitflow.md` y `docs/feature-contract.md`. Los agentes implementan en worktrees separados; el coordinador revisa e integra. No se publica una release de producto al integrar features en `develop`.

## Límites que afectan a varias utilidades

Las conversiones por extracción requieren texto seleccionable; los escaneos necesitan OCR previo. Editar, recortar o colocar una firma visible no constituye censura ni firma criptográfica. Modificar PDFs puede invalidar firmas existentes. La censura elimina el contenido original reconstruyendo páginas rasterizadas; hay que cubrir toda la región sensible y revisar la salida.

Recorte y superposiciones rechazan páginas rotadas con anotaciones para evitar descolocar enlaces o campos al normalizar el giro. La creación de formularios también rechaza esa combinación. Los formularios nuevos se definen mediante JSON y no pueden añadirse sobre otro formulario existente. Las imágenes de firma o marca se indican mediante una ruta local.

Resumen y traducción dependen de la respuesta del modelo. No se ha evaluado su precisión lingüística o factual. La traducción rechaza glifos que faltan en la fuente; no garantiza la composición de escrituras complejas como árabe. La compresión y reparación no garantizan reducción de tamaño o recuperación de documentos muy dañados.

## Motores externos

| Dependencia | Uso | Validación pendiente |
|---|---|---|
| LibreOffice | Word, PowerPoint y Excel a PDF | Conversiones reales y fidelidad con documentos Office. |
| Tesseract y datos de idiomas | OCR | Calidad de reconocimiento con el motor instalado. |
| Ghostscript y perfil ICC RGB | PDF/A-2b | Ejecución real; validación independiente con veraPDF para archivo oficial. |
| Ollama y modelo ya instalado | Resumen y traducción | Calidad del modelo. Conexión restringida a `127.0.0.1:11434`; nombres cloud rechazados. |
| Dispositivo y controlador WIA | Escaneo directo | Hardware físico; solo se ha probado el adaptador mediante simulación. |

Estos motores/modelos no se descargan automáticamente. Los casos de ausencia, error y respuesta de dependencias externas se prueban con dobles; eso no equivale a ejecutar el producto externo. Las conversiones integradas y el worker funcionan con dependencias empaquetadas.

## Evidencia de validación

La suite conjunta pasa 204 pruebas Python: las 114 anteriores de PDF y contrato, y 90 nuevas de imágenes. Incluye PDFs e imágenes generados, preservación de formularios, cifrado/descifrado y comprobación de píxeles de redacción. Los motores externos se simulan en su frontera, como indica la tabla anterior.

El worker empaquetado supera 13 ejecuciones funcionales más el rechazo de un identificador desconocido. Se comprueban páginas, texto, imágenes, formularios, cifrado, archivos de salida y originales intactos. El smoke corre fuera del checkout para impedir que importe accidentalmente módulos fuente.

Se corrigieron dos fallos detectados por estas pruebas: PyInstaller omitía módulos descubiertos dinámicamente y el smoke comparaba rutas temporales cortas de Windows con rutas canónicas. El empaquetado enumera ahora imports explícitos; el smoke normaliza las rutas. Ambos casos se reprodujeron y sus correcciones se revisaron de forma independiente.

TypeScript y Vite compilan. Se comprobaron los 32 formularios en navegador a 580 px, búsqueda, categorías, ausencia de overflow y bloqueo de procesamiento fuera del escritorio. Una utilidad temporal adicional permitió comprobar el descubrimiento automático, sus contadores y el control checkbox; se retiró tras la prueba. El scroll se restablece al abrir una herramienta.

Rust pasa formato, Clippy y compilación de su harness de pruebas; la lógica de negocio se prueba en Python. Se genera un MSI Windows x64 mediante WiX. No se ha validado una instalación y desinstalación en una VM limpia ni se ha firmado el instalador.

El historial de [Actions](https://github.com/UlloaSP/pdf/actions/workflows/ci.yml) conserva los checks de las PR y el build completo sobre develop. Los artefactos MSI están asociados a las ejecuciones completas. La [PR #34](https://github.com/UlloaSP/pdf/pull/34) registra las correcciones de interfaz y rutas Windows.

## Ajustes y actualizaciones

La [PR #41](https://github.com/UlloaSP/pdf/pull/41) incorpora preferencias locales y actualizaciones firmadas de Windows. Se comprobaron 18 casos de preferencias/controlador y 8 del manifiesto, lint/tipos, build, formato/Clippy y compilación de Rust. El MSI firmado y su manifiesto se generaron localmente; se verificó que normalizar el nombre para GitHub no cambia los bytes del instalador ni de su firma.

Se probó la interfaz en navegador a 580 x 500, texto de 18 px, persistencia tras recargar, recuperación de preferencias corruptas, atajos personalizados y conservación del formulario al abrir ajustes. La app nativa consultó el endpoint real y mostró el manifiesto no disponible, sin presentarlo como una versión actualizada. No existe aún la primera release; queda pendiente probar descarga, instalación y reinicio entre dos releases publicadas. La firma del actualizador no es Authenticode. Detalles en [actualizaciones](updating.md).

La revisión independiente detectó y corrigió el nombre de asset con espacios, la sobrescritura de releases públicas y dos detalles de interfaz. El resultado de CI y la disponibilidad real de CodeRabbit quedan registrados en la PR.

## Biblioteca de imágenes

La [PR #42](https://github.com/UlloaSP/pdf/pull/42) sustituye los filtros de categorías por PDF e Imágenes. Las 32 herramientas anteriores permanecen en PDF. La búsqueda se limita a la sección activa y se limpia al cambiar de sección. Se conserva la navegación por hover y teclado, el marco, los ajustes y el actualizador.

Cada utilidad nueva tiene formulario, motor, pruebas y documentación propia. Las PR de esta tabla están integradas en develop; los enlaces de utilidad detallan los formatos y límites.

| Utilidad | PR | Alcance |
|---|---|---|
| [Comprimir](features/image_compress.md) | [#43](https://github.com/UlloaSP/pdf/pull/43) | JPG, PNG de 8 bits y GIF animado; el ahorro depende del archivo. |
| [Redimensionar](features/image_resize.md) | [#44](https://github.com/UlloaSP/pdf/pull/44) | Por píxeles o porcentaje, con proporción opcional. |
| [Recortar](features/image_crop.md) | [#45](https://github.com/UlloaSP/pdf/pull/45) | Rectángulo definido por coordenadas en píxeles. |
| [Convertir a JPG](features/image_to_jpg.md) | [#46](https://github.com/UlloaSP/pdf/pull/46) | PNG, GIF, TIFF, BMP, WebP y PSD; fondo blanco para alfa. Sin SVG, HEIC ni RAW. |
| [Convertir desde JPG](features/image_from_jpg.md) | [#47](https://github.com/UlloaSP/pdf/pull/47) | PNG, GIF y GIF animado con imágenes de igual tamaño. |
| [Editor de fotos](features/image_edit.md) | [#48](https://github.com/UlloaSP/pdf/pull/48) | Ajustes de color, efectos, texto, marco y pegatina local mediante formulario. |
| [Ampliar](features/image_upscale.md) | [#49](https://github.com/UlloaSP/pdf/pull/49) | Lanczos 2x o 4x, sin reconstrucción mediante IA. |
| [Eliminar fondo](features/image_remove_background.md) | [#50](https://github.com/UlloaSP/pdf/pull/50) | rembg externo y modelo U2NET local; salida PNG con alfa. |
| [Marca de agua](features/image_watermark.md) | [#51](https://github.com/UlloaSP/pdf/pull/51) | Texto o imagen con posición y opacidad. |
| [Crear meme](features/image_meme.md) | [#52](https://github.com/UlloaSP/pdf/pull/52) | Texto superior e inferior sobre una imagen propia. |
| [Girar](features/image_rotate.md) | [#53](https://github.com/UlloaSP/pdf/pull/53) | 90, 180 o 270 grados; filtro de orientación. |
| [HTML a imagen](features/image_html.md) | [#54](https://github.com/UlloaSP/pdf/pull/54) | Chrome o Edge instalado, HTML local o URL, captura del área configurada en PNG/JPG. |
| [Pixelar](features/image_pixelate.md) | [#55](https://github.com/UlloaSP/pdf/pull/55) | Regiones manuales para pixelar o desenfocar; sin detección automática de caras. |

La unión de las ramas se probó antes de integrar y coincide con el código entregado. Pasaron 204 pruebas Python, 18 de frontend, lint, tipos y build. El worker compilado ejecutó 18 operaciones reales sobre las 11 utilidades de Pillow fuera del checkout, verificando dimensiones, píxeles, animación, transparencia y originales intactos. HTML a imagen se probó con Chrome real y un documento local con CSS. La inferencia real de rembg queda pendiente de instalar un modelo compatible; sus pruebas simulan el proceso externo. No se descargan modelos automáticamente.

En navegador se abrieron los 13 formularios de Imágenes y se verificaron las 32 tarjetas de PDF, la búsqueda por sección y el cambio entre bibliotecas. A 580 x 500 no apareció scroll externo ni desbordamiento horizontal. El CI completo de develop genera el MSI del conjunto; instalarlo y desinstalarlo en una VM limpia sigue pendiente.

CodeRabbit completó la revisión de la PR #42. Sus intentos manuales sobre las PR #43 a #55 devolvieron «Review rate limited»; cada PR registra una revisión independiente de otro agente, el commit revisado y CI aprobado, conforme al procedimiento de Gitflow. Estos estados limitados no se contabilizan como revisiones de CodeRabbit aprobadas.
