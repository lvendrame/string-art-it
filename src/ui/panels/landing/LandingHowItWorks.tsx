import { useTranslation } from "react-i18next";
import { LANDING_STEPS } from "./howItWorksContent";
import "./LandingHowItWorks.css";

export function LandingHowItWorks() {
  const { t } = useTranslation("landing");
  return (
    <section className="landing-how-it-works">
      <div className="landing-how-it-works__heading">{t("howItWorks.heading")}</div>
      <ol className="landing-how-it-works__list">
        {LANDING_STEPS.map((step, i) => (
          <li key={step.titleKey} className="landing-how-it-works__step">
            <span className="mono landing-how-it-works__step-index">{i + 1}</span>
            <div>
              <div className="landing-how-it-works__step-title">{t(step.titleKey)}</div>
              <div className="landing-how-it-works__step-description">{t(step.descriptionKey)}</div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
