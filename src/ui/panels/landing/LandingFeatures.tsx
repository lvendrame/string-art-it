import { useTranslation } from "react-i18next";
import { LANDING_FEATURES } from "./featuresContent";
import "./LandingFeatures.css";

export function LandingFeatures() {
  const { t } = useTranslation("landing");
  return (
    <section className="landing-features">
      <div className="landing-features__heading">{t("features.heading")}</div>
      <div className="landing-features__grid">
        {LANDING_FEATURES.map((f) => (
          <div key={f.titleKey} className="landing-features__card">
            <span className="landing-features__icon">
              <f.icon size={16} />
            </span>
            <span className="landing-features__title">{t(f.titleKey)}</span>
            <span className="landing-features__description">{t(f.descriptionKey)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
