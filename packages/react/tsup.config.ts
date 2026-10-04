import { copyFile } from "node:fs/promises";
import { defineConfig, type Options } from "tsup";

const shared: Options = {
  format: ["esm", "cjs"],
  dts: { compilerOptions: { paths: {} } },
  sourcemap: true,
  target: "es2020",
  external: ["react", "react-dom", "@permitojs/core"],
};

export default defineConfig([
  {
    ...shared,
    entry: ["src/index.ts"],
    // Every export of the main entry is a client component or hook (Next.js App Router).
    banner: { js: '"use client";' },
    async onSuccess() {
      await copyFile("src/styles.css", "dist/styles.css");
    },
  },
  {
    ...shared,
    entry: ["src/server.ts"],
  },
]);
