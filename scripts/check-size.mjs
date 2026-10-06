// Prüft die gzip-Größe der Einstiegspunkte (gebündelt und minifiziert) gegen feste Grenzen.
// Nutzung: pnpm build && pnpm check:size
import { createRequire } from "node:module";
import { gzipSync } from "node:zlib";

const require = createRequire(import.meta.url);
const { build } = require("esbuild");

// Grenzen in Bytes (gzip). Mit etwas Luft über dem Ist-Wert; wer sie erhöht, begründet es im PR.
const limits = [
  { name: "@permitojs/core", entry: "packages/core/dist/index.js", limit: 11_000 },
  { name: "@permitojs/core/ui", entry: "packages/core/dist/ui.js", limit: 14_500 },
  {
    name: "permito.global.js (script tag)",
    entry: "packages/core/dist/permito.global.js",
    limit: 15_500,
    bundled: true,
  },
  { name: "@permitojs/core/svelte", entry: "packages/core/dist/svelte.js", limit: 1_000 },
  { name: "@permitojs/core/vue", entry: "packages/core/dist/vue.js", limit: 1_500 },
  { name: "@permitojs/react", entry: "packages/react/dist/index.js", limit: 4_600 },
];

let failed = false;
for (const { name, entry, limit, bundled } of limits) {
  const result = await build({
    entryPoints: [entry],
    bundle: true,
    minify: true,
    format: "esm",
    platform: "browser",
    external: bundled ? [] : ["react", "react-dom", "react/jsx-runtime", "@permitojs/core", "vue"],
    write: false,
    logLevel: "silent",
  });
  const size = gzipSync(result.outputFiles[0].contents, { level: 9 }).length;
  const ok = size <= limit;
  failed ||= !ok;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}: ${size} B gzip (limit ${limit})`);
}
if (failed) process.exit(1);
