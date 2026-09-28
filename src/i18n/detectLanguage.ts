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
  if (lower.startsWith("pt")) return "pt-BR";
  if (lower.startsWith("es")) return "es";
  if (lower.startsWith("fr")) return "fr";
  if (lower.startsWith("de")) return "de";
  if (lower.startsWith("it")) return "it";
  if (lower.startsWith("nl")) return "nl";
  if (lower.startsWith("pl")) return "pl";
  if (lower.startsWith("ja")) return "ja";
  if (lower.startsWith("ru")) return "ru";
  if (lower.startsWith("uk")) return "uk";
  if (lower.startsWith("tr")) return "tr";
  if (lower.startsWith("zh")) return "zh-CN";
  return "en";
}
