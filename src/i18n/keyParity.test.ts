import { describe, expect, it } from "vitest";
import { NAMESPACES } from "./resources";
import { SUPPORTED_LANGUAGES } from "./languages";

const localeFiles = import.meta.glob<Record<string, unknown>>("./locales/*/*.json", { eager: true, import: "default" });

function localeFile(lng: string, ns: string): unknown {
  return localeFiles[`./locales/${lng}/${ns}.json`];
}

function leafKeyPaths(obj: unknown, prefix = ""): string[] {
  if (typeof obj !== "object" || obj === null) return [prefix];
  return Object.entries(obj as Record<string, unknown>).flatMap(([key, value]) =>
    leafKeyPaths(value, prefix ? `${prefix}.${key}` : key),
  );
}

describe("locale key parity", () => {
  const otherLanguages = SUPPORTED_LANGUAGES.filter((lng) => lng !== "en");

  it("every supported language has a file for every namespace", () => {
    const missing = SUPPORTED_LANGUAGES.flatMap((lng) =>
      NAMESPACES.filter((ns) => localeFile(lng, ns) === undefined).map((ns) => `${lng}/${ns}.json`),
    );
    expect(missing).toEqual([]);
  });

  for (const lng of otherLanguages) {
    it.each(NAMESPACES)(`en and ${lng} carry the same keys in %s.json`, (ns) => {
      const enKeys = new Set(leafKeyPaths(localeFile("en", ns)));
      const otherKeys = new Set(leafKeyPaths(localeFile(lng, ns)));

      const missingInOther = [...enKeys].filter((k) => !otherKeys.has(k));
      const missingInEn = [...otherKeys].filter((k) => !enKeys.has(k));

      expect({ missingInOther, missingInEn }).toEqual({ missingInOther: [], missingInEn: [] });
    });
  }
});
