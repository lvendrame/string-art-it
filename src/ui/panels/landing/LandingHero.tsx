import { useTranslation } from "react-i18next";

export function LandingHero() {
  const { t } = useTranslation("landing");
  return (
    <section style={{ maxWidth: 760, margin: "56px auto 0", padding: "0 24px", textAlign: "center", display: "flex", flexDirection: "column", gap: 12 }}>
      <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, color: "var(--text-primary)" }}>{t("hero.title")}</h1>
      <p style={{ margin: 0, fontSize: 15, color: "var(--text-secondary)", lineHeight: 1.5 }}>{t("hero.subtitle")}</p>
    </section>
  );
}
