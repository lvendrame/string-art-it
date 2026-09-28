import { afterEach, describe, expect, it, vi } from "vitest";

describe("i18n bootstrap", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
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

describe("lazy language loading", () => {
  afterEach(() => {
    vi.resetModules();
  });

  async function freshI18n() {
    vi.resetModules();
    return import("./index");
  }

  it("bundles only English up front", async () => {
    const { default: i18n } = await freshI18n();
    expect(i18n.hasResourceBundle("en", "common")).toBe(true);
    expect(i18n.hasResourceBundle("ja", "common")).toBe(false);
  });

  it("ensureLanguageLoaded adds every namespace of that language", async () => {
    const { default: i18n, ensureLanguageLoaded } = await freshI18n();
    await ensureLanguageLoaded("ja");
    expect(i18n.getFixedT("ja", "editorShell")("print")).toBe("印刷");
    expect(i18n.getFixedT("ja", "help")("tabs.about")).toBe("このアプリについて");
  });

  it("ensureLanguageLoaded resolves immediately for English", async () => {
    const { ensureLanguageLoaded } = await freshI18n();
    await expect(ensureLanguageLoaded("en")).resolves.toBeUndefined();
  });

  it("concurrent loads of the same language share one request", async () => {
    const { ensureLanguageLoaded } = await freshI18n();
    expect(ensureLanguageLoaded("de")).toBe(ensureLanguageLoaded("de"));
  });

  it("switchLanguage loads the language before changing to it", async () => {
    const { default: i18n, switchLanguage } = await freshI18n();
    await switchLanguage("fr");
    expect(i18n.language).toBe("fr");
    expect(i18n.t("print", { ns: "editorShell" })).toBe("Imprimer");
  });

  it("preloadAllLanguages loads every supported language", async () => {
    const { default: i18n, preloadAllLanguages } = await freshI18n();
    const { SUPPORTED_LANGUAGES } = await import("./languages");
    await preloadAllLanguages();
    expect(SUPPORTED_LANGUAGES.filter((lng) => !i18n.hasResourceBundle(lng, "common"))).toEqual([]);
  });
});
