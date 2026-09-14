import { isSupportedLanguage, type SupportedLanguage } from "./languages";

/**
 * Pure so it's testable without touching the i18next singleton or `navigator`/`window`.
 * A stored explicit choice always wins; otherwise fall back to the browser locale,
 * matching only on the "pt" prefix (covers "pt", "pt-BR", "pt-PT", ...).
 */
export function detectInitialLanguage(
  navigatorLanguage: string | undefined,
  stored: string | null,
): SupportedLanguage {
  if (isSupportedLanguage(stored)) return stored;
  const lower = (navigatorLanguage ?? "en").toLowerCase();
  return lower.startsWith("pt") ? "pt-BR" : "en";
}
