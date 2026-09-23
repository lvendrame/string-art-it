import js from "@eslint/js";
import importPlugin from "eslint-plugin-import";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

// Clean Architecture boundary (docs/specs/01-architecture.md): domain/ and application/
// are framework-free and must never reach into ui/ or import react/react-dom.
//
// import/no-restricted-paths resolves `from` against the filesystem (relative to
// basePath), so it only works for directory zones (ui/**) — it cannot match a bare
// package specifier like "react" against its node_modules location. Package-level bans
// use the core no-restricted-imports rule instead, which matches on the import
// specifier string itself.
export const boundaryDirectoryZonesRule = [
  "error",
  {
    zones: [
      { target: "./src/domain/**/*", from: ["./src/ui/**/*"] },
      { target: "./src/application/**/*", from: ["./src/ui/**/*"] },
    ],
  },
];

export const boundaryPackageBanRule = [
  "error",
  {
    paths: [
      { name: "react", message: "domain/application code must stay framework-free — see docs/specs/01-architecture.md." },
      { name: "react-dom", message: "domain/application code must stay framework-free — see docs/specs/01-architecture.md." },
    ],
  },
];

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      import: importPlugin,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
    },
  },
  {
    files: ["src/domain/**/*.{ts,tsx}", "src/application/**/*.{ts,tsx}"],
    plugins: { import: importPlugin },
    settings: {
      // typescript (not node): import/no-restricted-paths below must resolve the
      // @application/@domain/@i18n/@infrastructure/@ui/@ path aliases (tsconfig.app.json)
      // the same way the bundler does, or an aliased cross-boundary import (e.g. a
      // domain file importing "@ui/canvas") would silently resolve to nothing and slip
      // past the zone check — see boundaries.test.ts's alias-import regression case.
      "import/resolver": {
        typescript: { project: "./tsconfig.app.json" },
      },
    },
    rules: {
      "import/no-restricted-paths": boundaryDirectoryZonesRule,
      "no-restricted-imports": boundaryPackageBanRule,
    },
  },
);
