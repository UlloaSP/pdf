import { readFileSync } from "node:fs";
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
assert.equal(JSON.parse(read("package-lock.json")).version, version);
if (process.env.GITHUB_REF_TYPE === "tag")
  assert.equal(process.env.GITHUB_REF_NAME, `v${version}`);
console.log(`Versiones coherentes: ${version}`);
