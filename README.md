# PDF Utils

Aplicación de utilidades PDF para Windows. React + TypeScript + Vite en el frontend, Tauri 2 + Rust como backend local y un worker Python empaquetado para los motores. Sin servidor obligatorio.

El [plan de arquitectura](docs/architecture.md) contiene las decisiones, las 32 utilidades previstas y las fases de implementación.

## Estado

32 utilidades con búsqueda, filtros y formularios en español. Las operaciones que necesitan motores externos lo indican en su formulario. La vista de navegador permite consultar opciones; el procesamiento requiere la aplicación de escritorio. Consulta el [registro de entrega](docs/delivery.md) para ver las PR integradas, el alcance real y los límites de cada utilidad.

El [Gitflow](docs/gitflow.md) define ramas, PR y merges para cada petición. El [plan de implementación](docs/implementation-plan.md) recoge el reparto paralelo y los límites de esta entrega.

## Desarrollo

Para ver la interfaz basta con Node.js 24 y npm:

```powershell
npm ci
npm run dev
```

Abre `http://127.0.0.1:1420`. Para la aplicación de escritorio instala además Rust con toolchain MSVC, Visual Studio Build Tools con Desktop development with C++, Windows SDK y WebView2. El empaquetado MSI también requiere la característica opcional VBSCRIPT de Windows. Consulta los [requisitos oficiales](https://v2.tauri.app/start/prerequisites/).

```powershell
npm run desktop:dev
```

Antes del primer arranque nativo, prepara el worker con Python 3.14:

```powershell
python -m venv .venv
.venv/Scripts/python -m pip install -r engine/requirements.txt
.venv/Scripts/python scripts/build-engine.py
```

Repite el empaquetado cuando cambien los motores. El MSI incluye este worker y su runtime Python.

## Comprobaciones y compilación

```powershell
npm run check:version
npm run build
.venv/Scripts/python -m unittest discover -s engine/tests
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml
npm run desktop:build
```

El MSI se genera en `src-tauri/target/release/bundle/msi/`. Su instalación descarga WebView2 si falta; el procesamiento previsto será local, pero esta primera instalación puede necesitar Internet. El icono provisional se genera desde `assets/icon.svg` con `npm run tauri -- icon assets/icon.svg`.

## Releases

CI valida frontend y Rust, compila el MSI y lo conserva como artefacto. Release repite las validaciones y publica el instalador al recibir una etiqueta `vX.Y.Z`. Su ejecución manual solo genera el artefacto.

1. Actualiza la versión en `package.json`, `src-tauri/Cargo.toml` y `src-tauri/tauri.conf.json`, y actualiza el lockfile con `npm install --package-lock-only`.
2. Ejecuta `npm run check:version` y confirma los cambios en Git.
3. Crea y sube la etiqueta correspondiente, por ejemplo `git tag v0.1.0` y `git push origin v0.1.0`.

El workflow usa `GITHUB_TOKEN` con escritura solo en el trabajo de publicación. Los instaladores iniciales no están firmados. No se han publicado releases ni añadido actualizaciones automáticas.

`Cargo.lock` y `engine/requirements.txt` fijan las dependencias resueltas. CI ejecuta pruebas Python, empaqueta el worker y valida Rust antes de generar el MSI. Los motores adicionales se documentan por utilidad en `docs/features`.
