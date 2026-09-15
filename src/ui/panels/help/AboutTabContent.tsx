import { useState, type CSSProperties, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Send } from "lucide-react";
import pkg from "../../../../package.json";

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

const LABEL_STYLE: CSSProperties = { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--text-secondary)" };
const FIELD_STYLE: CSSProperties = {
  background: "var(--bg-panel-2)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  color: "var(--text-primary)",
  padding: "6px 8px",
  fontSize: 12.5,
  fontFamily: "inherit",
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
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 8, color: "var(--text-secondary)" }}>{t("about.appInfo.heading")}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 420 }}>
          <PropertyRow label={t("about.appInfo.name")} value={APP_NAME} />
          <PropertyRow label={t("about.appInfo.description")} value={t("about.appInfo.descriptionValue")} mono={false} />
          <PropertyRow label={t("about.appInfo.version")} value={pkg.version} />
          <PropertyRow label={t("about.appInfo.author")} value={AUTHOR_NAME} mono={false} />
        </div>
      </div>

      <div>
        <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 8, color: "var(--text-secondary)" }}>{t("about.contactForm.heading")}</div>
        <p style={{ fontSize: 12, color: "var(--text-secondary)", maxWidth: 420, marginTop: 0 }}>{t("about.contactForm.intro")}</p>
        <form onSubmit={(e: FormEvent) => e.preventDefault()} style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 420 }}>
          <label style={LABEL_STYLE}>
            {t("about.contactForm.name.label")}
            <input value={name} onChange={(e) => setName(e.target.value)} style={FIELD_STYLE} />
          </label>

          <label style={LABEL_STYLE}>
            {t("about.contactForm.subject.label")}
            <select value={subject} onChange={(e) => setSubject(e.target.value as SubjectOption)} style={FIELD_STYLE}>
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

          <label style={LABEL_STYLE}>
            {t("about.contactForm.message.label")}
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              style={{ ...FIELD_STYLE, resize: "vertical", minHeight: 90 }}
            />
          </label>

          <a
            href={mailtoHref ?? "#"}
            aria-disabled={!canSend}
            className="btn"
            onClick={(e) => {
              if (!canSend) e.preventDefault();
            }}
            style={{
              alignSelf: "flex-start",
              justifyContent: "center",
              borderRadius: "var(--radius-sm)",
              padding: "8px 16px",
              fontSize: 12,
              fontWeight: 700,
              gap: 6,
              textDecoration: "none",
              ...(canSend
                ? { background: "var(--accent)", color: "#fff", borderColor: "var(--accent)" }
                : { opacity: 0.5, pointerEvents: "none" as const }),
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

function PropertyRow({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        background: "var(--bg-app)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        padding: 12,
      }}
    >
      <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{label}</span>
      <span className={mono ? "mono" : undefined} style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", textAlign: "right" }}>
        {value}
      </span>
    </div>
  );
}
