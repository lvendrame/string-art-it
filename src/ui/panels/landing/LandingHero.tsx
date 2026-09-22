import { useTranslation } from "react-i18next";
import "./LandingHero.css";

export function LandingHero() {
  const { t } = useTranslation("landing");
  return (
    <section className="landing-hero">
      <h1 className="landing-hero__title">{t("hero.title")}</h1>
      <p className="landing-hero__subtitle">{t("hero.subtitle")}</p>
    </section>
  );
}
