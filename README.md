# PDF Utils

Aplicación de utilidades PDF e imágenes para Windows. React + TypeScript + Vite+ en el frontend, Tauri 2 + Rust como backend local y un worker Python empaquetado para los motores. Sin servidor obligatorio.

La interfaz usa Tailwind CSS v4 y componentes shadcn/ui sobre Radix, personalizados con los temas de la app. Los scripts de mantenimiento también usan TypeScript, ejecutado directamente por Node 24. Consulta las [convenciones del frontend](docs/frontend.md).

El [plan de arquitectura](docs/architecture.md) contiene las decisiones, las 32 utilidades previstas y las fases de implementación.

## Estado

45 utilidades con búsqueda y formularios en español, separadas en PDF e Imágenes en la sidebar. PDF conserva las 32 utilidades anteriores, incluidas las conversiones entre PDF e imágenes. Imágenes añade 13 herramientas de edición y conversión. Las operaciones que necesitan motores externos lo indican en su formulario. La vista de navegador permite consultar opciones; el procesamiento requiere la aplicación de escritorio. Consulta el [registro de entrega](docs/delivery.md) para ver las PR integradas, el alcance real y los límites de cada utilidad.

Eliminar fondo requiere rembg y un modelo U2NET local compatible. HTML a imagen utiliza Chrome o Edge instalado. Ampliar imagen usa interpolación Lanczos; pixelar requiere indicar las regiones. Los formatos admitidos y los límites están documentados por utilidad.

El [Gitflow](docs/gitflow.md) define ramas, PR y merges para cada petición. El [plan de implementación](docs/implementation-plan.md) recoge el reparto paralelo y los límites de esta entrega.

## Desarrollo

Para ver la interfaz basta con Node.js 24 y Vite+ 0.3.0. Instala Vite+ siguiendo su [guía oficial para Windows](https://viteplus.dev/guide/). El proyecto fija pnpm 11.1.3; `vp` lo selecciona automáticamente:

```powershell
vp install --frozen-lockfile
vp run dev
```

Abre `http://127.0.0.1:1420`. Para la aplicación de escritorio instala además Rust con toolchain MSVC, Visual Studio Build Tools con Desktop development with C++, Windows SDK y WebView2. El empaquetado MSI también requiere la característica opcional VBSCRIPT de Windows. Consulta los [requisitos oficiales](https://v2.tauri.app/start/prerequisites/).

Para el primer arranque nativo, desde la raíz del repositorio, prepara el worker con Python 3.14 y después inicia Tauri:

```powershell
vp install --frozen-lockfile
python -m venv .venv
.venv/Scripts/python -m pip install -r engine/requirements.txt
.venv/Scripts/python scripts/build-engine.py
$env:Path = "$env:USERPROFILE\.cargo\bin;$env:Path"
vp run desktop:dev
```

Repite el empaquetado cuando cambien los motores. El MSI incluye este worker y su runtime Python.

En los siguientes arranques basta con configurar el PATH de Cargo si no está disponible en la terminal y ejecutar `vp run desktop:dev`. Tauri inicia Vite automáticamente: cierra antes cualquier `vp run dev` que esté usando el puerto 1420. No hace falta arrancar un servidor backend aparte. Los motores opcionales (LibreOffice, Tesseract, Ghostscript u Ollama) se instalan según la utilidad; consulta sus requisitos en `docs/features`.

Las tareas de interfaz siguen la [skill frontend-design de Claude](.claude/skills/frontend-design/SKILL.md), incluida en el repositorio y referenciada en `AGENTS.md`.

## Comprobaciones y compilación

```powershell
vp run check
vp run test
vp run test:updater-manifest
vp run check:version
vp run build
.venv/Scripts/python -m unittest discover -s engine/tests
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml
vp run desktop:build
```

El MSI se genera en `src-tauri/target/release/bundle/msi/`. Su instalación descarga WebView2 si falta; el procesamiento previsto será local, pero esta primera instalación puede necesitar Internet. El icono provisional se genera desde `assets/icon.svg` con `vp run tauri icon assets/icon.svg`.

## Releases

CI valida frontend y Rust, compila el MSI y lo conserva como artefacto. Release repite las validaciones y publica el instalador al recibir una etiqueta `vX.Y.Z`. Su ejecución manual solo genera el artefacto.

1. Actualiza la versión en `package.json`, `src-tauri/Cargo.toml` y `src-tauri/tauri.conf.json`, y actualiza el lockfile con `vp install --lockfile-only`.
2. Ejecuta `vp run check:version` y confirma los cambios en Git.
3. Crea y sube la etiqueta correspondiente, por ejemplo `git tag v0.1.0` y `git push origin v0.1.0`.

El workflow usa `GITHUB_TOKEN` con escritura solo en el trabajo de publicación. Las releases generan MSI, firma del actualizador y `latest.json`. La clave de firma está configurada en el secreto `TAURI_SIGNING_PRIVATE_KEY`. Esta firma no es un certificado Authenticode. La primera release sigue pendiente. Consulta [actualizaciones de Windows](docs/updating.md).

`pnpm-lock.yaml`, `Cargo.lock` y `engine/requirements.txt` fijan las dependencias resueltas. CI ejecuta pruebas Python, empaqueta el worker y valida Rust antes de generar el MSI. Los motores adicionales se documentan por utilidad en `docs/features`.

La gestión de dependencias usa siempre pnpm a través de `vp install`, `vp add` y `vp remove`. No uses npm/npx ni mantengas otros lockfiles. Los scripts se ejecutan con `vp run <script>`; `pnpm run <script>` también usa las mismas herramientas locales. `vp run build` incluye la comprobación TypeScript antes del bundle. `vp run check` ejecuta lint y tipos con Vite+; el formato de los archivos existentes se conserva.

Los scripts `.mts` usan el type stripping nativo de Node 24, sin transpilar en tiempo de ejecución. `vp run typecheck:scripts` aplica `scripts/tsconfig.json` con tipos estrictos y sintaxis borrable; `vp run build` incluye este check. Node no comprueba tipos al ejecutarlos. Consulta la [documentación oficial de Node](https://nodejs.org/docs/latest-v24.x/api/typescript.html).

## Ajustes de la app

El pie de la sidebar contiene Ajustes y el estado de actualizaciones. Por defecto se comprueba al arrancar, tras 20 segundos, y cada seis horas. Puedes elegir una hora o un día, o desactivar las comprobaciones automáticas. La descarga y la instalación siempre requieren una acción; instalar se bloquea mientras se procesa un documento.

Los ajustes se guardan localmente: tema del sistema, claro u oscuro; color de acento; contraste de bordes; opacidad de la sidebar; animaciones; fuente y tamaño; carpeta de salida; confirmaciones y atajos. Ctrl+, abre ajustes, Ctrl+K busca herramientas y Ctrl+Shift+H vuelve al catálogo de la sección actual y limpia la búsqueda. Abrir ajustes conserva el formulario actual. El navegador permite probar la interfaz; el actualizador funciona en la app de Windows.
