export type SupportedLanguage = "en" | "pt-BR" | "es" | "fr" | "de";

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = ["en", "pt-BR", "es", "fr", "de"];

export const LANGUAGE_META: Record<SupportedLanguage, { nativeLabel: string }> = {
  en: { nativeLabel: "English" },
  "pt-BR": { nativeLabel: "Português (BR)" },
  es: { nativeLabel: "Español" },
  fr: { nativeLabel: "Français" },
  de: { nativeLabel: "Deutsch" },
};

export function isSupportedLanguage(value: string | null | undefined): value is SupportedLanguage {
  return value === "en" || value === "pt-BR" || value === "es" || value === "fr" || value === "de";
}
