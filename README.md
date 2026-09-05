# PDF Utils

Aplicación de utilidades PDF para Windows. React + TypeScript + Vite+ en el frontend, Tauri 2 + Rust como backend local y un worker Python empaquetado para los motores. Sin servidor obligatorio.

El [plan de arquitectura](docs/architecture.md) contiene las decisiones, las 32 utilidades previstas y las fases de implementación.

## Estado

32 utilidades con búsqueda, filtros y formularios en español. Las operaciones que necesitan motores externos lo indican en su formulario. La vista de navegador permite consultar opciones; el procesamiento requiere la aplicación de escritorio. Consulta el [registro de entrega](docs/delivery.md) para ver las PR integradas, el alcance real y los límites de cada utilidad.

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

El workflow usa `GITHUB_TOKEN` con escritura solo en el trabajo de publicación. Los instaladores iniciales no están firmados. No se han publicado releases ni añadido actualizaciones automáticas.

`pnpm-lock.yaml`, `Cargo.lock` y `engine/requirements.txt` fijan las dependencias resueltas. CI ejecuta pruebas Python, empaqueta el worker y valida Rust antes de generar el MSI. Los motores adicionales se documentan por utilidad en `docs/features`.

La gestión de dependencias usa siempre pnpm a través de `vp install`, `vp add` y `vp remove`. No uses npm/npx ni mantengas otros lockfiles. Los scripts se ejecutan con `vp run <script>`; `pnpm run <script>` también usa las mismas herramientas locales. `vp run build` incluye la comprobación TypeScript antes del bundle. `vp run check` ejecuta lint y tipos con Vite+; el formato de los archivos existentes se conserva.
