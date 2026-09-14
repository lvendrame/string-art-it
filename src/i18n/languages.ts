export type SupportedLanguage = "en" | "pt-BR";

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = ["en", "pt-BR"];

export const LANGUAGE_META: Record<SupportedLanguage, { nativeLabel: string }> = {
  en: { nativeLabel: "English" },
  "pt-BR": { nativeLabel: "Português (BR)" },
};

export function isSupportedLanguage(value: string | null | undefined): value is SupportedLanguage {
  return value === "en" || value === "pt-BR";
}
