import { existsSync, readFileSync } from "node:fs";
import assert from "node:assert/strict";

const read = (path: string): string =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const metadata: unknown = JSON.parse(read("package.json"));
assert.ok(metadata !== null && typeof metadata === "object" && "version" in metadata);
const { version } = metadata;
assert.ok(typeof version === "string", "La versión debe ser texto.");
assert.match(version, /^\d+\.\d+\.\d+$/, "Usa una versión MSI X.Y.Z");
const [major, minor, patch] = version.split(".").map(Number);
assert.ok(major !== undefined && minor !== undefined && patch !== undefined);
assert.ok(
  major <= 255 && minor <= 255 && patch <= 65535,
  "Versión fuera de los límites MSI",
);
const tauri: unknown = JSON.parse(read("src-tauri/tauri.conf.json"));
assert.ok(tauri !== null && typeof tauri === "object" && "version" in tauri);
assert.equal(tauri.version, version);
assert.equal(
  read("src-tauri/Cargo.toml").match(/^version = "([^"]+)"/m)?.[1],
  version,
);
// pnpm's lockfile records dependency resolution, not the root app version.
assert.ok(existsSync(new URL("../pnpm-lock.yaml", import.meta.url)));
for (const lockfile of ["package-lock.json", "npm-shrinkwrap.json", "yarn.lock", "bun.lock", "bun.lockb"])
  assert.ok(!existsSync(new URL(`../${lockfile}`, import.meta.url)), `Elimina ${lockfile}: usa pnpm`);
if (process.env.GITHUB_REF_TYPE === "tag")
  assert.equal(process.env.GITHUB_REF_NAME, `v${version}`);
console.log(`Versiones coherentes: ${version}`);
