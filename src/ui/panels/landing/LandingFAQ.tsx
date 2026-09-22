import { useTranslation } from "react-i18next";
import { FAQ_ITEMS } from "./faqContent";
import "./LandingFAQ.css";

export function LandingFAQ() {
  const { t } = useTranslation("landing");
  return (
    <section className="landing-faq">
      <div className="landing-faq__heading">{t("faq.heading")}</div>
      <div className="landing-faq__list">
        {FAQ_ITEMS.map((item) => (
          <div key={item.questionKey}>
            <div className="landing-faq__question">{t(item.questionKey)}</div>
            <div className="landing-faq__answer">{t(item.answerKey)}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
