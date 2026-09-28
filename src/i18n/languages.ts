export type SupportedLanguage = "en" | "pt-BR" | "es" | "fr" | "de" | "it" | "nl" | "pl" | "ja";

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = ["en", "pt-BR", "es", "fr", "de", "it", "nl", "pl", "ja"];

export const LANGUAGE_META: Record<SupportedLanguage, { nativeLabel: string }> = {
  en: { nativeLabel: "English" },
  "pt-BR": { nativeLabel: "Português (BR)" },
  es: { nativeLabel: "Español" },
  fr: { nativeLabel: "Français" },
  de: { nativeLabel: "Deutsch" },
  it: { nativeLabel: "Italiano" },
  nl: { nativeLabel: "Nederlands" },
  pl: { nativeLabel: "Polski" },
  ja: { nativeLabel: "日本語" },
};

export function isSupportedLanguage(value: string | null | undefined): value is SupportedLanguage {
  return SUPPORTED_LANGUAGES.includes(value as SupportedLanguage);
}
