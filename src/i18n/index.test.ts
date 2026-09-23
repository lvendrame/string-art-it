import { afterEach, describe, expect, it, vi } from "vitest";

describe("i18n bootstrap", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("initializes without throwing when navigator and document are unavailable (SSR-style environment)", async () => {
    vi.stubGlobal("navigator", undefined);
    vi.stubGlobal("document", undefined);
    vi.resetModules();

    await expect(import("./index")).resolves.toBeDefined();
  });

  it("sets document.documentElement.lang on init when document is available", async () => {
    vi.resetModules();
    const mod = await import("./index");
    expect(document.documentElement.lang).toBe(mod.default.language);
  });

  it("persists the stored language only for a supported languageChanged code", async () => {
    vi.resetModules();
    const languagePreference = await import("@infrastructure/persistence/languagePreference");
    const setSpy = vi.spyOn(languagePreference, "setStoredLanguage");
    const mod = await import("./index");

    mod.default.emit("languageChanged", "not-a-real-language");
    expect(setSpy).not.toHaveBeenCalledWith("not-a-real-language");

    await mod.default.changeLanguage("es");
    expect(setSpy).toHaveBeenCalledWith("es");
  });
});
