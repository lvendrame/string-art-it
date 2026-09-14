import { describe, expect, it } from "vitest";
import { resources } from "./resources";

function leafKeyPaths(obj: unknown, prefix = ""): string[] {
  if (typeof obj !== "object" || obj === null) return [prefix];
  return Object.entries(obj as Record<string, unknown>).flatMap(([key, value]) =>
    leafKeyPaths(value, prefix ? `${prefix}.${key}` : key),
  );
}

describe("locale key parity", () => {
  const namespaces = Object.keys(resources.en) as (keyof typeof resources.en)[];

  it.each(namespaces)("en and pt-BR carry the same keys in %s.json", (ns) => {
    const enKeys = new Set(leafKeyPaths(resources.en[ns]));
    const ptKeys = new Set(leafKeyPaths(resources["pt-BR"][ns]));

    const missingInPt = [...enKeys].filter((k) => !ptKeys.has(k));
    const missingInEn = [...ptKeys].filter((k) => !enKeys.has(k));

    expect({ missingInPt, missingInEn }).toEqual({ missingInPt: [], missingInEn: [] });
  });
});
