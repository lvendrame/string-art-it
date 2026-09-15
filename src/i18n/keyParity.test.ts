import { describe, expect, it } from "vitest";
import { resources } from "./resources";
import { SUPPORTED_LANGUAGES } from "./languages";

function leafKeyPaths(obj: unknown, prefix = ""): string[] {
  if (typeof obj !== "object" || obj === null) return [prefix];
  return Object.entries(obj as Record<string, unknown>).flatMap(([key, value]) =>
    leafKeyPaths(value, prefix ? `${prefix}.${key}` : key),
  );
}

describe("locale key parity", () => {
  const namespaces = Object.keys(resources.en) as (keyof typeof resources.en)[];
  const otherLanguages = SUPPORTED_LANGUAGES.filter((lng) => lng !== "en");

  for (const lng of otherLanguages) {
    it.each(namespaces)(`en and ${lng} carry the same keys in %s.json`, (ns) => {
      const enKeys = new Set(leafKeyPaths(resources.en[ns]));
      const otherKeys = new Set(leafKeyPaths(resources[lng][ns]));

      const missingInOther = [...enKeys].filter((k) => !otherKeys.has(k));
      const missingInEn = [...otherKeys].filter((k) => !enKeys.has(k));

      expect({ missingInOther, missingInEn }).toEqual({ missingInOther: [], missingInEn: [] });
    });
  }
});
