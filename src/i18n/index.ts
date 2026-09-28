import i18n, { type InitOptions } from "i18next";
import { initReactI18next } from "react-i18next";
import { enResources, loadLocaleBundle, NAMESPACES } from "./resources";
import { detectInitialLanguage } from "./detectLanguage";
import { getStoredLanguage, setStoredLanguage } from "@infrastructure/persistence/languagePreference";
import { isSupportedLanguage, SUPPORTED_LANGUAGES, type SupportedLanguage } from "./languages";

const initialLanguage = detectInitialLanguage(
  typeof navigator !== "undefined" ? navigator.language : undefined,
  getStoredLanguage(),
);

// No backend and synchronous init (initAsync: false) with no Suspense — components need
// translated text on their very first render, since react-i18next's useTranslation()
// falls back to this module-level singleton for every existing component/test that
// renders with no <I18nextProvider> wrapping it. Only English is bundled up front; other
// languages are added by ensureLanguageLoaded() before they are rendered.
const initOptions: InitOptions = {
  resources: { en: enResources },
  lng: initialLanguage,
  fallbackLng: "en",
  supportedLngs: SUPPORTED_LANGUAGES,
  ns: NAMESPACES,
  defaultNS: "common",
  interpolation: { escapeValue: false },
  initAsync: false,
  react: { useSuspense: false },
};

void i18n.use(initReactI18next).init(initOptions);

if (typeof document !== "undefined") {
  document.documentElement.lang = i18n.language;
}

// Persisted centrally here (not in the component that calls changeLanguage) so it can
// never be missed regardless of what triggers a language change.
i18n.on("languageChanged", (lng) => {
  if (isSupportedLanguage(lng)) setStoredLanguage(lng);
  if (typeof document !== "undefined") document.documentElement.lang = lng;
});

const pendingLoads = new Map<SupportedLanguage, Promise<void>>();

function isLoaded(lng: SupportedLanguage): boolean {
  return lng === "en" || i18n.hasResourceBundle(lng, "common");
}

async function addLocaleBundle(lng: Exclude<SupportedLanguage, "en">): Promise<void> {
  const bundle = await loadLocaleBundle(lng);
  for (const ns of NAMESPACES) i18n.addResourceBundle(lng, ns, bundle[ns], true, true);
}

export function ensureLanguageLoaded(lng: SupportedLanguage): Promise<void> {
  if (isLoaded(lng)) return Promise.resolve();
  let pending = pendingLoads.get(lng);
  if (!pending) {
    pending = addLocaleBundle(lng as Exclude<SupportedLanguage, "en">).finally(() => pendingLoads.delete(lng));
    pendingLoads.set(lng, pending);
  }
  return pending;
}

export async function switchLanguage(lng: SupportedLanguage): Promise<void> {
  await ensureLanguageLoaded(lng);
  await i18n.changeLanguage(lng);
}

export function preloadAllLanguages(): Promise<void> {
  return Promise.allSettled(SUPPORTED_LANGUAGES.map(ensureLanguageLoaded)).then(() => undefined);
}

export default i18n;
