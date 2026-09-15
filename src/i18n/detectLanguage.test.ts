import { describe, expect, it } from "vitest";
import { detectInitialLanguage } from "./detectLanguage";

describe("detectInitialLanguage", () => {
  it("prefers a stored explicit choice over the browser locale", () => {
    expect(detectInitialLanguage("pt-BR", "en")).toBe("en");
    expect(detectInitialLanguage("en-US", "pt-BR")).toBe("pt-BR");
  });

  it("ignores an unsupported stored value and falls back to detection", () => {
    expect(detectInitialLanguage("en-US", "it")).toBe("en");
  });

  it.each(["pt", "pt-BR", "pt-PT", "PT-br"])("maps browser locale %s to pt-BR when nothing is stored", (nav) => {
    expect(detectInitialLanguage(nav, null)).toBe("pt-BR");
  });

  it.each(["es", "es-ES", "ES-mx"])("maps browser locale %s to es when nothing is stored", (nav) => {
    expect(detectInitialLanguage(nav, null)).toBe("es");
  });

  it.each(["fr", "fr-FR", "FR-ca"])("maps browser locale %s to fr when nothing is stored", (nav) => {
    expect(detectInitialLanguage(nav, null)).toBe("fr");
  });

  it.each(["de", "de-DE", "DE-at"])("maps browser locale %s to de when nothing is stored", (nav) => {
    expect(detectInitialLanguage(nav, null)).toBe("de");
  });

  it.each(["en-US", "it-IT", undefined])("falls back to en for %s when nothing is stored", (nav) => {
    expect(detectInitialLanguage(nav, null)).toBe("en");
  });
});
