import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateUpdateManifest } from "./generate-update-manifest.mts";

async function fixture(t: TestContext) {
  const rootDir = await mkdtemp(join(tmpdir(), "pdf-updater-"));
  t.after(() => rm(rootDir, { recursive: true, force: true }));
  await mkdir(join(rootDir, "src-tauri"));
  const bundleDir = join(rootDir, "bundles");
  await mkdir(bundleDir);
  await writeFile(join(rootDir, "package.json"), '{"version":"1.2.3"}');
  await writeFile(join(rootDir, "src-tauri/tauri.conf.json"), '{"version":"1.2.3"}');
  await writeFile(join(rootDir, "src-tauri/Cargo.toml"), '[package]\nversion = "1.2.3"\n');
  const installer = "PDF Utils_1.2.3_x64_es-ES.msi";
  await writeFile(join(bundleDir, installer), Buffer.from("fixture MSI bytes"));
  // Structurally valid fixture; not a cryptographic signature of a real MSI.
  const signature = Buffer.from(
    [
      "untrusted comment: test signature",
      Buffer.alloc(74, 1).toString("base64"),
      "trusted comment: timestamp:1",
      Buffer.alloc(64, 2).toString("base64"),
    ].join("\n"),
  ).toString("base64");
  await writeFile(join(bundleDir, `${installer}.sig`), `${signature}\n`);
  return {
    rootDir,
    bundleDir,
    installer,
    signature,
    tag: "v1.2.3",
    repository: "UlloaSP/pdf",
    publishedAt: new Date("2026-09-06T10:00:00Z"),
  };
}

void test("stages safe asset names without changing signed bytes and uses their exact URL", async (t) => {
  const f = await fixture(t);
  const msiBytes = await readFile(join(f.bundleDir, f.installer));
  const signatureBytes = await readFile(join(f.bundleDir, `${f.installer}.sig`));
  const result = await generateUpdateManifest(f);
  assert.equal(result.version, "1.2.3");
  assert.equal(result.pub_date, "2026-09-06T10:00:00.000Z");
  assert.deepEqual(result.platforms, {
    "windows-x86_64": {
      signature: f.signature,
      url: "https://github.com/UlloaSP/pdf/releases/download/v1.2.3/PDF-Utils_1.2.3_x64_es-ES.msi",
    },
  });
  assert.deepEqual(JSON.parse(await readFile(join(f.bundleDir, "latest.json"), "utf8")), result);
  const assetName = new URL(result.platforms["windows-x86_64"].url).pathname.split("/").at(-1);
  assert.ok(assetName);
  assert.deepEqual(
    (await readdir(f.bundleDir)).sort((a, b) => a.localeCompare(b)),
    [assetName, `${assetName}.sig`, "latest.json"].sort((a, b) => a.localeCompare(b)),
  );
  assert.deepEqual(await readFile(join(f.bundleDir, assetName)), msiBytes);
  assert.deepEqual(await readFile(join(f.bundleDir, `${assetName}.sig`)), signatureBytes);
  assert.deepEqual(await generateUpdateManifest(f), result);
});

void test("rejects a normalized signature collision before renaming either artifact", async (t) => {
  const f = await fixture(t);
  const originalMsi = await readFile(join(f.bundleDir, f.installer));
  const originalSignature = await readFile(join(f.bundleDir, `${f.installer}.sig`));
  const collision = "PDF-Utils_1.2.3_x64_es-ES.msi.sig";
  await writeFile(join(f.bundleDir, collision), "existing signature");
  await assert.rejects(generateUpdateManifest(f), /Colisión/);
  assert.deepEqual(await readFile(join(f.bundleDir, f.installer)), originalMsi);
  assert.deepEqual(await readFile(join(f.bundleDir, `${f.installer}.sig`)), originalSignature);
  assert.equal(await readFile(join(f.bundleDir, collision), "utf8"), "existing signature");
  await assert.rejects(readFile(join(f.bundleDir, "PDF-Utils_1.2.3_x64_es-ES.msi")), {
    code: "ENOENT",
  });
  await assert.rejects(readFile(join(f.bundleDir, "latest.json")), { code: "ENOENT" });
});

void test("rejects an existing normalized MSI without replacing either file", async (t) => {
  const f = await fixture(t);
  const collision = "PDF-Utils_1.2.3_x64_es-ES.msi";
  await writeFile(join(f.bundleDir, collision), "existing MSI");
  await assert.rejects(generateUpdateManifest(f), /exactamente un MSI/);
  assert.equal(await readFile(join(f.bundleDir, collision), "utf8"), "existing MSI");
  assert.equal(await readFile(join(f.bundleDir, f.installer), "utf8"), "fixture MSI bytes");
  assert.equal(await readFile(join(f.bundleDir, `${f.installer}.sig`), "utf8"), `${f.signature}\n`);
});

void test("rejects a tag for a different version before writing a manifest", async (t) => {
  const f = await fixture(t);
  await assert.rejects(generateUpdateManifest({ ...f, tag: "v1.2.4" }), /etiqueta/);
  await assert.rejects(readFile(join(f.bundleDir, "latest.json")), { code: "ENOENT" });
});

void test("rejects unsigned installers", async (t) => {
  const f = await fixture(t);
  await rm(join(f.bundleDir, `${f.installer}.sig`));
  await assert.rejects(generateUpdateManifest(f), /firma/);
});

void test("rejects missing, ambiguous and empty installers", async (t) => {
  const f = await fixture(t);
  await writeFile(join(f.bundleDir, "stale.msi"), "old");
  await assert.rejects(generateUpdateManifest(f), /exactamente un MSI/);
  await rm(join(f.bundleDir, "stale.msi"));
  await writeFile(join(f.bundleDir, f.installer), "");
  await assert.rejects(generateUpdateManifest(f), /vacío/);
  await rm(join(f.bundleDir, f.installer));
  await assert.rejects(generateUpdateManifest(f), /exactamente un MSI/);
});

void test("rejects arbitrary signature text and truncated Minisign envelopes", async (t) => {
  const f = await fixture(t);
  await writeFile(join(f.bundleDir, `${f.installer}.sig`), "not a signature");
  await assert.rejects(generateUpdateManifest(f), /base64/);
  await writeFile(
    join(f.bundleDir, `${f.installer}.sig`),
    Buffer.from("untrusted comment: truncated").toString("base64"),
  );
  await assert.rejects(generateUpdateManifest(f), /completa/);
});

void test("rejects incoherent native version and invalid repository", async (t) => {
  const f = await fixture(t);
  await assert.rejects(
    generateUpdateManifest({ ...f, repository: "owner/repo/extra" }),
    /Repositorio/,
  );
  await writeFile(join(f.rootDir, "src-tauri/tauri.conf.json"), '{"version":"9.9.9"}');
  await assert.rejects(generateUpdateManifest(f), /Tauri/);
});
