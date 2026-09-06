import assert from "node:assert/strict";
import { readFile, readdir, rename, stat, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));

// This validates the envelope, not its cryptography. Tauri signs the MSI during
// the build; the updater verifies those exact bytes against its embedded pubkey.
function validateSignature(signature) {
  assert.match(signature, /^[A-Za-z0-9+/]+={0,2}$/, "La firma debe ser base64 de Tauri.");
  assert.ok(signature.length < 16_384, "Firma excesivamente grande.");
  const decoded = Buffer.from(signature, "base64");
  assert.equal(decoded.toString("base64"), signature, "Firma base64 inválida.");
  const lines = decoded.toString("utf8").trim().split(/\r?\n/);
  assert.equal(lines.length, 4, "Se esperaba una firma Minisign completa.");
  assert.ok(lines[0].startsWith("untrusted comment: "), "Cabecera de firma inválida.");
  assert.ok(lines[2].startsWith("trusted comment: "), "Comentario de firma inválido.");
  for (const [index, size] of [
    [1, 74],
    [3, 64],
  ]) {
    assert.match(lines[index], /^[A-Za-z0-9+/]+={0,2}$/, "Firma Minisign inválida.");
    const bytes = Buffer.from(lines[index], "base64");
    assert.equal(bytes.length, size, "Longitud de firma Minisign inválida.");
    assert.equal(bytes.toString("base64"), lines[index], "Firma Minisign base64 inválida.");
  }
}

export async function generateUpdateManifest({
  rootDir,
  tag,
  repository,
  bundleDir = join(rootDir, "src-tauri/target/release/bundle/msi"),
  publishedAt = new Date(),
}) {
  const { version } = await readJson(join(rootDir, "package.json"));
  assert.match(
    version,
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/,
    "Usa una versión estable MSI X.Y.Z.",
  );
  const [major, minor, patch] = version.split(".").map(Number);
  assert.ok(major <= 255 && minor <= 255 && patch <= 65535, "Versión fuera de los límites MSI.");
  assert.equal(tag, `v${version}`, "La etiqueta debe coincidir con la versión de la aplicación.");
  assert.match(repository, /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/, "Repositorio GitHub inválido.");
  assert.equal(
    (await readJson(join(rootDir, "src-tauri/tauri.conf.json"))).version,
    version,
    "La versión de Tauri debe coincidir.",
  );
  const cargo = await readFile(join(rootDir, "src-tauri/Cargo.toml"), "utf8");
  assert.equal(
    cargo.match(/^version\s*=\s*"([^"]+)"/m)?.[1],
    version,
    "La versión Rust debe coincidir.",
  );
  const files = await readdir(bundleDir);
  const installers = files.filter((name) => name.endsWith(".msi"));
  assert.equal(
    installers.length,
    1,
    "Se requiere exactamente un MSI para evitar publicar un instalador ambiguo.",
  );
  const [installer] = installers;
  const assetName = installer.replace(/[^A-Za-z0-9._-]+/g, "-");
  assert.match(
    assetName,
    /^[A-Za-z0-9][A-Za-z0-9._-]*\.msi$/,
    "Nombre de instalador no publicable.",
  );
  if (assetName !== installer) {
    for (const target of [assetName, `${assetName}.sig`]) {
      assert.ok(
        !files.some((name) => name.toLowerCase() === target.toLowerCase()),
        `Colisión de artefacto: ${target}`,
      );
    }
  }
  assert.ok(
    installer.includes(`_${version}_x64`),
    "El nombre del MSI debe identificar la versión y arquitectura x64.",
  );
  assert.ok((await stat(join(bundleDir, installer))).size > 0, "El MSI está vacío.");
  const signatures = files.filter((name) => name.endsWith(".msi.sig"));
  assert.deepEqual(
    signatures,
    [`${installer}.sig`],
    "Falta la firma del MSI o hay firmas ambiguas.",
  );
  const signature = (await readFile(join(bundleDir, `${installer}.sig`), "utf8")).trim();
  validateSignature(signature);
  const manifest = {
    version,
    notes: `PDF Utils ${version}. Consulta las notas de esta versión en GitHub.`,
    pub_date: publishedAt.toISOString(),
    platforms: {
      "windows-x86_64": {
        signature,
        url: `https://github.com/${repository}/releases/download/${encodeURIComponent(tag)}/${assetName}`,
      },
    },
  };
  // GitHub rewrites spaces and other special characters in uploaded asset names.
  // Rename both files first so the URL and uploaded basename agree. File bytes,
  // including the signed MSI, remain unchanged.
  if (assetName !== installer) {
    await rename(join(bundleDir, installer), join(bundleDir, assetName));
    try {
      await rename(join(bundleDir, `${installer}.sig`), join(bundleDir, `${assetName}.sig`));
    } catch (error) {
      await rename(join(bundleDir, assetName), join(bundleDir, installer));
      throw error;
    }
  }
  await writeFile(join(bundleDir, "latest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return manifest;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  await generateUpdateManifest({
    rootDir: fileURLToPath(new URL("../", import.meta.url)),
    tag: process.env.RELEASE_TAG,
    repository: process.env.GITHUB_REPOSITORY,
  });
  console.log("latest.json generado para windows-x86_64 con firma del MSI.");
}
