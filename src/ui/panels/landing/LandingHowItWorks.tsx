import { useTranslation } from "react-i18next";
import { LANDING_STEPS } from "./howItWorksContent";

export function LandingHowItWorks() {
  const { t } = useTranslation("landing");
  return (
    <section style={{ maxWidth: 760, margin: "40px auto 0", padding: "0 24px" }}>
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
        {t("howItWorks.heading")}
      </div>
      <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        {LANDING_STEPS.map((step, i) => (
          <li
            key={step.titleKey}
            style={{
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
              background: "var(--bg-app)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              padding: 12,
            }}
          >
            <span
              className="mono"
              style={{
                flex: "0 0 24px",
                height: 24,
                borderRadius: "999px",
                background: "var(--accent-soft)",
                color: "var(--accent)",
                fontSize: 12,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {i + 1}
            </span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{t(step.titleKey)}</div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{t(step.descriptionKey)}</div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
