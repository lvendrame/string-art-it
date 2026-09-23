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
  },
});
