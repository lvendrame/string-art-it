import { isSupportedLanguage, type SupportedLanguage } from "../../i18n/languages";

// Mirrors autosave.ts's storage-key convention and best-effort try/catch posture —
// language preference is a UI convenience, never something a language switch should
// fail loudly over (private browsing, quota, etc.).
const LANGUAGE_KEY = "stringartit:language:v1";

export function getStoredLanguage(): SupportedLanguage | null {
  try {
    const raw = window.localStorage.getItem(LANGUAGE_KEY);
    return isSupportedLanguage(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function setStoredLanguage(lng: SupportedLanguage): void {
  try {
    window.localStorage.setItem(LANGUAGE_KEY, lng);
  } catch {
    // best-effort, same posture as autosave.ts
  }
}
