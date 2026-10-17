// Builds the sibling ../learning-engine app with a relative asset base
// (so the bundle works at any URL depth) and copies dist/ into
// public/learning-engine/, where Ignite Lab serves it (src/pages/Learn.jsx).
// The copied bundle is self-contained: pyodide runtime, sql.js wasm, sw.js
// and the rest of learning-engine/public travel with it.
//
// Usage: npm run build:engine   (from ignite-lab-app-day3/)
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const igniteRoot = path.resolve(here, "..");
const leRoot = path.resolve(igniteRoot, "..", "learning-engine");
const lePyodide = path.join(leRoot, "public", "pyodide");
const dist = path.join(leRoot, "dist");
const target = path.join(igniteRoot, "public", "learning-engine");

if (!fs.existsSync(path.join(leRoot, "package.json"))) {
  console.error(`learning-engine not found at ${leRoot} — expected a sibling folder.`);
  process.exit(1);
}

// Deterministic env: relative base ("./" vite.config default) and the engine's
// own public/ directory for generated assets.
delete process.env.VITE_BASE;
delete process.env.L_PUBLIC;

if (!fs.existsSync(lePyodide)) {
  console.log("→ syncing pyodide runtime assets (first run) …");
  const sync = spawnSync(
    process.execPath,
    [path.join(leRoot, "scripts", "pyodide-assets.js")],
    { cwd: leRoot, stdio: "inherit" }
  );
  if (sync.status !== 0) {
    console.error("pyodide asset sync failed");
    process.exit(sync.status ?? 1);
  }
}

console.log("→ building learning-engine (relative base) …");
const build = spawnSync("npm", ["run", "build"], {
  cwd: leRoot,
  stdio: "inherit",
  shell: true, // Windows: npm resolves as npm.cmd
});
if (build.status !== 0) {
  console.error("learning-engine build failed");
  process.exit(build.status ?? 1);
}

console.log("→ copying dist → public/learning-engine/");
fs.rmSync(target, { recursive: true, force: true });
fs.cpSync(dist, target, { recursive: true });

// Safety net: make sure the pyodide runtime is present in the embed (vite
// emits it from the engine's public/, but an interrupted build may not have).
if (fs.existsSync(lePyodide) && !fs.existsSync(path.join(target, "pyodide"))) {
  fs.cpSync(lePyodide, path.join(target, "pyodide"), { recursive: true });
}

const files = fs
  .readdirSync(target, { withFileTypes: true, recursive: true })
  .filter((e) => e.isFile()).length;
console.log(`✓ learning-engine embedded (${files} files). Open /learn in the app.`);