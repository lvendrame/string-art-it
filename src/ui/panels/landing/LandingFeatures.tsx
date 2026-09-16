import { useTranslation } from "react-i18next";
import { LANDING_FEATURES } from "./featuresContent";

export function LandingFeatures() {
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
        {t("features.heading")}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        {LANDING_FEATURES.map((f) => (
          <div
            key={f.titleKey}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              background: "var(--bg-app)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              padding: 12,
            }}
          >
            <span style={{ color: "var(--accent)", display: "flex" }}>
              <f.icon size={16} />
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{t(f.titleKey)}</span>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{t(f.descriptionKey)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
