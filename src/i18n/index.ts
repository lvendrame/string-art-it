import i18n, { type InitOptions } from "i18next";
import { initReactI18next } from "react-i18next";
import { resources, NAMESPACES } from "./resources";
import { detectInitialLanguage } from "./detectLanguage";
import { getStoredLanguage, setStoredLanguage } from "@infrastructure/persistence/languagePreference";
import { isSupportedLanguage } from "./languages";

const initialLanguage = detectInitialLanguage(
  typeof navigator !== "undefined" ? navigator.language : undefined,
  getStoredLanguage(),
);

// No backend, bundled resources, synchronous init (initImmediate: false) and no
// Suspense — components need translated text on their very first render, since
// react-i18next's useTranslation() falls back to this module-level singleton for
// every existing component/test that renders with no <I18nextProvider> wrapping it.
const initOptions: InitOptions = {
  resources,
  lng: initialLanguage,
  fallbackLng: "en",
  supportedLngs: ["en", "pt-BR", "es", "fr", "de"],
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

export default i18n;
