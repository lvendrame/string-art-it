import { useTranslation } from "react-i18next";
import { FAQ_ITEMS } from "./faqContent";

export function LandingFAQ() {
  const { t } = useTranslation("landing");
  return (
    <section style={{ maxWidth: 760, margin: "40px auto 56px", padding: "0 24px" }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.06em",
          color: "var(--text-tertiary)",
          textTransform: "uppercase",
          marginBottom: 12,
          textAlign: "center",
        }}
      >
        {t("faq.heading")}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {FAQ_ITEMS.map((item) => (
          <div key={item.questionKey}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>{t(item.questionKey)}</div>
            <div style={{ fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.5 }}>{t(item.answerKey)}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
