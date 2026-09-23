import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

function src(...segments: string[]) {
  return fileURLToPath(new URL(["./src", ...segments].join("/"), import.meta.url));
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: "@application", replacement: src("application") },
      { find: "@domain", replacement: src("domain") },
      { find: "@i18n", replacement: src("i18n") },
      { find: "@infrastructure", replacement: src("infrastructure") },
      { find: "@ui", replacement: src("ui") },
      { find: "@", replacement: src() },
    ],
  },
  build: {
    sourcemap: true,
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    // svg2pdf.js's package.json "main" (used by Vitest's Node/SSR module resolution)
    // points at its UMD build, which expects a pre-existing global `jsPDF` and throws
    // on import under Vitest even though the real app never hits this — a normal
    // `vite build` resolves the "browser" condition instead, landing on the ESM build
    // that imports jsPDF properly. Test-only alias to the same ESM build Vite already
    // picks in production, so `pdfExport.ts` can be imported/tested at all.
    alias: [{ find: "svg2pdf.js", replacement: src("../node_modules/svg2pdf.js/dist/svg2pdf.es.min.js") }],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/test/**", "src/**/*.d.ts", "src/main.tsx"],
    },
  },
});
