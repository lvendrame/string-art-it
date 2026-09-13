import { useState } from "react";
import type { EditorMode } from "../../../application/document";
import { HELP_TABS, MODE_TO_HELP_TAB, type HelpSection, type HelpTabId } from "./helpContent";

// docs/specs/20-help.md — full-bleed overlay, same convention as StatisticsPanel /
// PrintPreviewPanel (no backdrop, no Escape-to-close, no aria-modal dialog) so Help
// doesn't invent a new close convention this app doesn't otherwise use. HelpPanel is
// only ever mounted while the overlay is open, so the lazy useState initializer below
// re-runs fresh on every open — reopening after switching modes re-defaults the tab
// with no extra effect needed.
export function HelpPanel({ currentMode, onClose }: { currentMode: EditorMode; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<HelpTabId>(() => MODE_TO_HELP_TAB[currentMode] ?? HELP_TABS[0].id);
  const tab = HELP_TABS.find((t) => t.id === activeTab) ?? HELP_TABS[0];

  return (
    <div style={{ position: "absolute", inset: 0, background: "var(--bg-app)", zIndex: 10, overflowY: "auto", padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <span style={{ fontWeight: 700, fontSize: 15 }}>Help</span>
        <button className="btn" onClick={onClose} style={{ borderRadius: 6, padding: "4px 10px", fontSize: 12 }}>Close</button>
      </div>

      <div role="tablist" aria-label="Help topics" style={{ display: "flex", flexWrap: "wrap", borderBottom: "1px solid var(--border)", marginBottom: 20 }}>
        {HELP_TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            id={`help-tab-${t.id}`}
            aria-selected={activeTab === t.id}
            aria-controls={`help-panel-${t.id}`}
            className="btn"
            onClick={() => setActiveTab(t.id)}
            style={{
              flex: "0 0 auto",
              justifyContent: "center",
              border: "none",
              borderRadius: 0,
              borderBottom: `2px solid ${activeTab === t.id ? "var(--accent)" : "transparent"}`,
              padding: "9px 14px",
              fontSize: 12,
              fontWeight: 700,
              background: "transparent",
              color: activeTab === t.id ? "var(--text-primary)" : "var(--text-tertiary)",
              gap: 6,
            }}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`help-panel-${tab.id}`} aria-labelledby={`help-tab-${tab.id}`} style={{ maxWidth: 720, display: "flex", flexDirection: "column", gap: 20 }}>
        {tab.sections.map((section, i) => (
          <HelpSectionView key={section.heading ?? i} section={section} />
        ))}
      </div>
    </div>
  );
}

function HelpSectionView({ section }: { section: HelpSection }) {
  return (
    <div>
      {section.heading && <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 8, color: "var(--text-secondary)" }}>{section.heading}</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {section.items.map((item) => (
          <div key={item.label} style={{ display: "flex", gap: 12, fontSize: 12.5 }}>
            <span style={{ fontWeight: 700, flex: "0 0 160px", color: "var(--text-primary)" }}>{item.label}</span>
            <span style={{ color: "var(--text-secondary)" }}>{item.description}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
