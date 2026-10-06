import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: {
      index: "src/index.ts",
      ui: "src/ui/index.ts",
      svelte: "src/svelte/index.ts",
      vue: "src/vue/index.ts",
    },
    external: ["vue"],
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: true,
    target: "es2020",
    loader: { ".css": "text" },
    async onSuccess() {
      const { copyFile } = await import("node:fs/promises");
      await copyFile("src/styles.css", "dist/styles.css");
    },
  },
  {
    // Script-tag build for sites without a bundler.
    entry: { permito: "src/ui/auto.ts" },
    format: ["iife"],
    outExtension: () => ({ js: ".global.js" }),
    minify: true,
    sourcemap: true,
    target: "es2018",
    loader: { ".css": "text" },
  },
]);
