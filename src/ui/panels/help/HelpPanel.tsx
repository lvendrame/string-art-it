import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import type { EditorMode } from "../../../application/document";
import { HELP_TABS, MODE_TO_HELP_TAB, type HelpSection, type HelpTabId } from "./helpContent";

// docs/specs/20-help.md — full-bleed overlay, same convention as StatisticsPanel /
// PrintPreviewPanel (no backdrop, no Escape-to-close, no aria-modal dialog) so Help
// doesn't invent a new close convention this app doesn't otherwise use. HelpPanel is
// only ever mounted while the overlay is open, so the lazy useState initializer below
// re-runs fresh on every open — reopening after switching modes re-defaults the tab
// with no extra effect needed.
export function HelpPanel({ currentMode, onClose }: { currentMode: EditorMode; onClose: () => void }) {
  const { t } = useTranslation(["help", "common", "editorShell"]);
  const [activeTab, setActiveTab] = useState<HelpTabId>(() => MODE_TO_HELP_TAB[currentMode] ?? HELP_TABS[0].id);
  const tab = HELP_TABS.find((tb) => tb.id === activeTab) ?? HELP_TABS[0];

  return (
    <div style={{ position: "absolute", inset: 0, background: "var(--bg-app)", zIndex: 10, overflowY: "auto", padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <span style={{ fontWeight: 700, fontSize: 15 }}>{t("help", { ns: "editorShell" })}</span>
        <button className="btn" onClick={onClose} style={{ borderRadius: 6, padding: "4px 10px", fontSize: 12 }}>{t("actions.close", { ns: "common" })}</button>
      </div>

      <div role="tablist" aria-label={t("topicsAriaLabel", { ns: "help" })} style={{ display: "flex", flexWrap: "wrap", borderBottom: "1px solid var(--border)", marginBottom: 20 }}>
        {HELP_TABS.map((tb) => (
          <button
            key={tb.id}
            role="tab"
            id={`help-tab-${tb.id}`}
            aria-selected={activeTab === tb.id}
            aria-controls={`help-panel-${tb.id}`}
            className="btn"
            onClick={() => setActiveTab(tb.id)}
            style={{
              flex: "0 0 auto",
              justifyContent: "center",
              border: "none",
              borderRadius: 0,
              borderBottom: `2px solid ${activeTab === tb.id ? "var(--accent)" : "transparent"}`,
              padding: "9px 14px",
              fontSize: 12,
              fontWeight: 700,
              background: "transparent",
              color: activeTab === tb.id ? "var(--text-primary)" : "var(--text-tertiary)",
              gap: 6,
            }}
          >
            <tb.icon size={14} />
            {t(tb.labelKey)}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`help-panel-${tab.id}`} aria-labelledby={`help-tab-${tab.id}`} style={{ maxWidth: 720, display: "flex", flexDirection: "column", gap: 20 }}>
        {tab.Content ? (
          <tab.Content />
        ) : (
          (tab.sections ?? []).map((section, i) => <HelpSectionView key={section.headingKey ?? i} section={section} t={t} />)
        )}
      </div>
    </div>
  );
}

function HelpSectionView({ section, t }: { section: HelpSection; t: TFunction<["help", "common"]> }) {
  return (
    <div>
      {section.headingKey && <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 8, color: "var(--text-secondary)" }}>{t(section.headingKey)}</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {section.items.map((item) => (
          <div key={item.labelKey} style={{ display: "flex", gap: 12, fontSize: 12.5 }}>
            <span style={{ fontWeight: 700, flex: "0 0 160px", color: "var(--text-primary)" }}>{t(item.labelKey)}</span>
            <span style={{ color: "var(--text-secondary)" }}>{t(item.descriptionKey)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
