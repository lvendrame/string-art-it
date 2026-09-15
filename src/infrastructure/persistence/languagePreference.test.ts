import { afterEach, describe, expect, it } from "vitest";
import { getStoredLanguage, setStoredLanguage } from "./languagePreference";

describe("languagePreference", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("returns null when nothing is stored", () => {
    expect(getStoredLanguage()).toBeNull();
  });

  it("round-trips a supported language", () => {
    setStoredLanguage("pt-BR");
    expect(getStoredLanguage()).toBe("pt-BR");
    expect(window.localStorage.getItem("stringartit:language:v1")).toBe("pt-BR");
  });

  it("ignores a corrupted/unsupported stored value", () => {
    window.localStorage.setItem("stringartit:language:v1", "it");
    expect(getStoredLanguage()).toBeNull();
  });
});
