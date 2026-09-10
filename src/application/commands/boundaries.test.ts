import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";
// eslint.config.js ships no type declarations of its own.
// @ts-expect-error -- untyped JS config module, see comment above
import config from "../../../eslint.config.js";

// Proves the Clean Architecture boundary rules (docs/specs/01-architecture.md) actually
// fire, without leaving a permanently-violating fixture file in src/. Runs ESLint's
// Node API against inline snippets at virtual file paths.
async function lint(source: string, filePath: string) {
  const eslint = new ESLint({ overrideConfigFile: true, overrideConfig: config });
  const [result] = await eslint.lintText(source, { filePath });
  return result?.messages ?? [];
}

const REACT_IMPORT = "import { useState } from 'react';\nexport const x = useState;\n";

describe("Clean Architecture boundaries", () => {
  it("flags a domain-layer file importing the react package", async () => {
    const messages = await lint(REACT_IMPORT, "src/domain/shapes/_check.ts");

    expect(messages.some((m) => m.ruleId === "no-restricted-imports")).toBe(true);
  });

  it("flags an application-layer file importing the react package", async () => {
    const messages = await lint(REACT_IMPORT, "src/application/document/_check.ts");

    expect(messages.some((m) => m.ruleId === "no-restricted-imports")).toBe(true);
  });

  it("does not flag a ui-layer file importing the react package", async () => {
    const messages = await lint(REACT_IMPORT, "src/ui/canvas/_check.ts");

    expect(messages.some((m) => m.ruleId === "no-restricted-imports")).toBe(false);
  });

  it("flags a domain-layer file reaching into ui/", async () => {
    const source = "import { Foo } from '../../ui/canvas';\nexport const y = Foo;\n";

    const messages = await lint(source, "src/domain/shapes/_check.ts");

    expect(messages.some((m) => m.ruleId === "import/no-restricted-paths")).toBe(true);
  });
});
