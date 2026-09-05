import { existsSync, readFileSync } from "node:fs";
import assert from "node:assert/strict";

const read = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const { version } = JSON.parse(read("package.json"));
assert.match(version, /^\d+\.\d+\.\d+$/, "Usa una versión MSI X.Y.Z");
const parts = version.split(".").map(Number);
assert.ok(
  parts[0] <= 255 && parts[1] <= 255 && parts[2] <= 65535,
  "Versión fuera de los límites MSI",
);
assert.equal(JSON.parse(read("src-tauri/tauri.conf.json")).version, version);
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
