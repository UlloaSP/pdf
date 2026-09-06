# Actualizaciones de Windows

La aplicación consulta el canal estable en `https://github.com/UlloaSP/pdf/releases/latest/download/latest.json`. El manifiesto identifica la versión y la URL del MSI para `windows-x86_64`, e incluye el contenido de su archivo `.msi.sig`. Tauri verifica la firma con la clave pública incluida en la aplicación antes de instalar. Formato y comportamiento: [documentación oficial del updater de Tauri 2](https://v2.tauri.app/plugin/updater/).

## Publicación

La primera release con este sistema está pendiente. Configurar el updater no crea una release ni garantiza que el endpoint exista ya. Hay que publicar e instalar una versión que incorpore el updater para comprobar después una actualización real a una versión superior.

El workflow `Release Windows MSI` conserva dos recorridos:

1. Ejecución manual: valida y compila el MSI como artefacto de Actions, sin publicar release y sin requerir la clave de firma.
2. Push de etiqueta `vX.Y.Z`: exige el secreto `TAURI_SIGNING_PRIVATE_KEY`, compila con `bundle.createUpdaterArtifacts: true`, genera `latest.json` y publica MSI, `.msi.sig` y manifiesto juntos. La release se mantiene como borrador hasta terminar la subida de los archivos.

La configuración habitual conserva `createUpdaterArtifacts: false`. El workflow de etiqueta aplica un archivo de configuración temporal para activarlo solo durante el build firmado. La clave se pasa por el entorno del paso de compilación, con contraseña vacía. No se imprime ni se incorpora a artefactos.

`scripts/generate-update-manifest.mts` exige coherencia entre la etiqueta, package.json, Tauri y Cargo; una versión MSI estable; un único instalador x64 no vacío; y su firma Minisign completa en base64. Copia la firma real producida por Tauri sin sustituirla por una firma de prueba. La validación de formato del script no sustituye la verificación criptográfica que realiza el updater.

Antes de generar el manifiesto, normaliza los nombres del MSI y de su firma a ASCII seguro, por ejemplo `PDF-Utils_0.1.0_x64_es-ES.msi`. GitHub modifica nombres de assets con espacios; la normalización hace que la URL del manifiesto coincida con el archivo subido. Solo cambia los nombres, conserva los bytes firmados y rechaza colisiones antes de renombrar.

Antes de etiquetar, sigue `docs/gitflow.md`, promociona la versión aprobada a `main` y actualiza las versiones coordinadas. El workflow detiene una release de etiqueta si falta el secreto o si los artefactos no cumplen las comprobaciones.

## Claves y firma del instalador

El secreto del repositorio `TAURI_SIGNING_PRIVATE_KEY` contiene la clave de actualizaciones. La copia privada local está fuera del repositorio en `C:/Users/ulloa/.tauri/pdf-utils.key`. Conserva una copia de seguridad privada y controlada. No pegues su contenido en documentación, commits, logs, PRs ni mensajes. Perder la clave impide firmar nuevas actualizaciones que acepten las instalaciones actuales; cambiar de clave requiere planificar la migración.

Esta firma protege el archivo que descarga el updater. No equivale a la firma Authenticode de Windows ni acredita un editor ante SmartScreen. Los instaladores siguen sin certificado Authenticode; ese proceso es independiente.

## Comprobaciones

Ejecuta `vp run test:updater-manifest` para probar el generador. En CI, `vp run update:manifest` toma `RELEASE_TAG` y `GITHUB_REPOSITORY` del entorno y escribe el manifiesto junto al MSI firmado.

Los tests de `scripts/generate-update-manifest.test.mts` usan artefactos temporales para verificar el manifiesto y el rechazo de versiones, firmas e instaladores inválidos. Sus firmas son fixtures estructurales y no se publican. El workflow los ejecuta antes del MSI. Queda pendiente comprobar el recorrido de actualización entre dos releases reales firmadas; generar el manifiesto no prueba la instalación ni el reinicio en Windows.

Una ejecución repetida solo puede completar una release en borrador. El workflow rechaza reemplazar assets de una release pública para evitar descoordinar el instalador y su firma.
