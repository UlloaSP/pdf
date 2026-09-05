# PDF Utils

Base de una aplicación de utilidades PDF para Windows. React + TypeScript + Vite en el frontend, Tauri 2 + Rust como backend local. Sin servidor.

El [plan de arquitectura](docs/architecture.md) contiene las decisiones, las 32 utilidades previstas y las fases de implementación.

## Estado

Catálogo en español con búsqueda y filtros, conexión de diagnóstico al backend y workflows para MSI x64. Las operaciones PDF aún no están implementadas. La vista en navegador indica que no hay motor nativo.

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

## Comprobaciones y compilación

```powershell
npm run check:version
npm run build
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

La validación nativa se ejecutará en GitHub Actions: el equipo donde se inicializó el proyecto no tiene Rust instalado. El primer build resolverá las dependencias Rust; conviene incorporar el `Cargo.lock` generado y usar `--locked` antes de la primera distribución estable.
