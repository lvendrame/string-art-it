import commonEn from "./locales/en/common.json";
import boardSetupEn from "./locales/en/boardSetup.json";
import editorShellEn from "./locales/en/editorShell.json";
import menusEn from "./locales/en/menus.json";
import toolbarsEn from "./locales/en/toolbars.json";
import panelsEn from "./locales/en/panels.json";
import printPreviewEn from "./locales/en/printPreview.json";
import canvasEn from "./locales/en/canvas.json";
import helpEn from "./locales/en/help.json";
import errorsEn from "./locales/en/errors.json";
import cookieConsentEn from "./locales/en/cookieConsent.json";
import landingEn from "./locales/en/landing.json";
import type { SupportedLanguage } from "./languages";

// English is bundled into the main chunk: it is the fallback language and must be
// available synchronously on first render. Every other language is split into its own
// lazily-loaded chunk (one per language, see vite.config.ts codeSplitting groups).
export const enResources = {
  common: commonEn,
  boardSetup: boardSetupEn,
  editorShell: editorShellEn,
  menus: menusEn,
  toolbars: toolbarsEn,
  panels: panelsEn,
  printPreview: printPreviewEn,
  canvas: canvasEn,
  help: helpEn,
  errors: errorsEn,
  cookieConsent: cookieConsentEn,
  landing: landingEn,
} as const;

export type Namespace = keyof typeof enResources;
export type LocaleBundle = Record<Namespace, Record<string, unknown>>;

export const NAMESPACES = Object.keys(enResources) as Namespace[];

const lazyLocaleFiles = import.meta.glob<Record<string, unknown>>(["./locales/*/*.json", "!./locales/en/*.json"], {
  import: "default",
});

export async function loadLocaleBundle(lng: Exclude<SupportedLanguage, "en">): Promise<LocaleBundle> {
  const entries = await Promise.all(
    NAMESPACES.map(async (ns) => [ns, await lazyLocaleFiles[`./locales/${lng}/${ns}.json`]()] as const),
  );
  return Object.fromEntries(entries) as LocaleBundle;
}
