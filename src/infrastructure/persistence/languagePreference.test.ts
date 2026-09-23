import { afterEach, describe, expect, it, vi } from "vitest";
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

  it("returns null instead of throwing when localStorage.getItem throws", () => {
    const spy = vi.spyOn(window.localStorage.__proto__, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(getStoredLanguage()).toBeNull();
    spy.mockRestore();
  });

  it("silently swallows an error when localStorage.setItem throws", () => {
    const spy = vi.spyOn(window.localStorage.__proto__, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });
    expect(() => setStoredLanguage("pt-BR")).not.toThrow();
    spy.mockRestore();
  });
});
