import { describe, expect, it } from "vitest";
import { detectInitialLanguage } from "./detectLanguage";

describe("detectInitialLanguage", () => {
  it("prefers a stored explicit choice over the browser locale", () => {
    expect(detectInitialLanguage("pt-BR", "en")).toBe("en");
    expect(detectInitialLanguage("en-US", "pt-BR")).toBe("pt-BR");
  });

  it("ignores an unsupported stored value and falls back to detection", () => {
    expect(detectInitialLanguage("en-US", "fr")).toBe("en");
  });

  it.each(["pt", "pt-BR", "pt-PT", "PT-br"])("maps browser locale %s to pt-BR when nothing is stored", (nav) => {
    expect(detectInitialLanguage(nav, null)).toBe("pt-BR");
  });

  it.each(["en-US", "fr-FR", "de", undefined])("falls back to en for %s when nothing is stored", (nav) => {
    expect(detectInitialLanguage(nav, null)).toBe("en");
  });
});
