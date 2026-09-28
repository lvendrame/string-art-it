export type SupportedLanguage = "en" | "pt-BR" | "es" | "fr" | "de" | "it";

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = ["en", "pt-BR", "es", "fr", "de", "it"];

export const LANGUAGE_META: Record<SupportedLanguage, { nativeLabel: string }> = {
  en: { nativeLabel: "English" },
  "pt-BR": { nativeLabel: "Português (BR)" },
  es: { nativeLabel: "Español" },
  fr: { nativeLabel: "Français" },
  de: { nativeLabel: "Deutsch" },
  it: { nativeLabel: "Italiano" },
};

export function isSupportedLanguage(value: string | null | undefined): value is SupportedLanguage {
  return SUPPORTED_LANGUAGES.includes(value as SupportedLanguage);
}
