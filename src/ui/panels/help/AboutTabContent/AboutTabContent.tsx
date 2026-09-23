import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Send } from "lucide-react";
import pkg from "../../../../../package.json";
import { PropertyRow } from "./PropertyRow";
import "./AboutTabContent.css";

const CONTACT_EMAIL = "lfsvendrame@gmail.com";
const APP_NAME = "StringArtIt";
const AUTHOR_NAME = "Luís Fernando Saquetim Vendrame";

const SUBJECT_OPTIONS = ["question", "support", "issue", "other"] as const;
type SubjectOption = (typeof SUBJECT_OPTIONS)[number];

// docs/specs/28-help-about-tab.md — the mailto subject always uses this canonical
// English token regardless of UI locale (only the visible <option> labels are
// translated), so the recipient always sees a consistent, recognizable subject line.
const SUBJECT_TOKEN: Record<SubjectOption, string> = {
  question: "Question",
  support: "Support",
  issue: "Issue",
  other: "Other",
};

export function AboutTabContent() {
  const { t } = useTranslation("help");
  const [name, setName] = useState("");
  const [subject, setSubject] = useState<SubjectOption | "">("");
  const [message, setMessage] = useState("");

  const canSend = name.trim() !== "" && subject !== "" && message.trim() !== "";
  const mailtoHref = canSend
    ? `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`${APP_NAME} - ${SUBJECT_TOKEN[subject as SubjectOption]}`)}&body=${encodeURIComponent(
        t("about.contactForm.mailBody", { name, message }),
      )}`
    : undefined;

  return (
    <div className="about-tab-content">
      <div>
        <div className="about-tab-content__section-heading">{t("about.appInfo.heading")}</div>
        <div className="about-tab-content__app-info">
          <PropertyRow label={t("about.appInfo.name")} value={APP_NAME} />
          <PropertyRow label={t("about.appInfo.description")} value={t("about.appInfo.descriptionValue")} mono={false} />
          <PropertyRow label={t("about.appInfo.version")} value={pkg.version} />
          <PropertyRow label={t("about.appInfo.author")} value={AUTHOR_NAME} mono={false} />
        </div>
      </div>

      <div>
        <div className="about-tab-content__section-heading">{t("about.contactForm.heading")}</div>
        <p className="about-tab-content__intro">{t("about.contactForm.intro")}</p>
        <form onSubmit={(e: FormEvent) => e.preventDefault()} className="about-tab-content__form">
          <label className="about-tab-content__field-label">
            {t("about.contactForm.name.label")}
            <input value={name} onChange={(e) => setName(e.target.value)} className="about-tab-content__field" />
          </label>

          <label className="about-tab-content__field-label">
            {t("about.contactForm.subject.label")}
            <select value={subject} onChange={(e) => setSubject(e.target.value as SubjectOption)} className="about-tab-content__field">
              <option value="" disabled>
                {t("about.contactForm.subject.placeholder")}
              </option>
              {SUBJECT_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {t(`about.contactForm.subject.options.${opt}`)}
                </option>
              ))}
            </select>
          </label>

          <label className="about-tab-content__field-label">
            {t("about.contactForm.message.label")}
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              className="about-tab-content__field about-tab-content__field--textarea"
            />
          </label>

          <a
            href={mailtoHref ?? "#"}
            aria-disabled={!canSend}
            className={`btn about-tab-content__send${canSend ? " about-tab-content__send--ready" : " is-disabled"}`}
            onClick={(e) => {
              if (!canSend) e.preventDefault();
            }}
          >
            <Send size={14} />
            {t("about.contactForm.send")}
          </a>
        </form>
      </div>
    </div>
  );
}
