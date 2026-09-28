import { describe, expect, it } from "vitest";
import { detectInitialLanguage } from "./detectLanguage";

describe("detectInitialLanguage", () => {
  it("prefers a stored explicit choice over the browser locale", () => {
    expect(detectInitialLanguage("pt-BR", "en")).toBe("en");
    expect(detectInitialLanguage("en-US", "pt-BR")).toBe("pt-BR");
  });

  it("ignores an unsupported stored value and falls back to detection", () => {
    expect(detectInitialLanguage("en-US", "ko")).toBe("en");
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

  it.each(["it", "it-IT", "IT-ch"])("maps browser locale %s to it when nothing is stored", (nav) => {
    expect(detectInitialLanguage(nav, null)).toBe("it");
  });

  it.each(["nl", "nl-NL", "NL-be"])("maps browser locale %s to nl when nothing is stored", (nav) => {
    expect(detectInitialLanguage(nav, null)).toBe("nl");
  });

  it.each(["pl", "pl-PL", "PL-pl"])("maps browser locale %s to pl when nothing is stored", (nav) => {
    expect(detectInitialLanguage(nav, null)).toBe("pl");
  });

  it.each(["ja", "ja-JP", "JA-jp"])("maps browser locale %s to ja when nothing is stored", (nav) => {
    expect(detectInitialLanguage(nav, null)).toBe("ja");
  });

  it.each(["ru", "ru-RU", "RU-by"])("maps browser locale %s to ru when nothing is stored", (nav) => {
    expect(detectInitialLanguage(nav, null)).toBe("ru");
  });

  it.each(["en-US", "ko-KR", undefined])("falls back to en for %s when nothing is stored", (nav) => {
    expect(detectInitialLanguage(nav, null)).toBe("en");
  });
});
