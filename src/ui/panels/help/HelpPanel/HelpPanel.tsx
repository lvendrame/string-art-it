import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { EditorMode } from "@application/document";
import { HELP_TABS, MODE_TO_HELP_TAB, type HelpTabId } from "@ui/panels/help/helpContent";
import { OverlayPanel } from "@ui/panels/OverlayPanel/OverlayPanel";
import { OverlayPanelHeader } from "@ui/panels/OverlayPanel/OverlayPanelHeader";
import { HelpSectionView } from "./HelpSectionView";
import "./HelpPanel.css";

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
    <OverlayPanel className="help-panel">
      <OverlayPanelHeader title={t("help", { ns: "editorShell" })} onClose={onClose} />

      <div role="tablist" aria-label={t("topicsAriaLabel", { ns: "help" })} className="help-panel__tabs">
        {HELP_TABS.map((tb) => (
          <button
            key={tb.id}
            role="tab"
            id={`help-tab-${tb.id}`}
            aria-selected={activeTab === tb.id}
            aria-controls={`help-panel-${tb.id}`}
            className={`btn tab-underline help-panel__tab${activeTab === tb.id ? " tab-underline--active" : ""}`}
            onClick={() => setActiveTab(tb.id)}
          >
            <tb.icon size={14} />
            {t(tb.labelKey)}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`help-panel-${tab.id}`} aria-labelledby={`help-tab-${tab.id}`} className="help-panel__tabpanel">
        {tab.Content ? (
          <tab.Content />
        ) : (
          (tab.sections ?? []).map((section, i) => <HelpSectionView key={section.headingKey ?? i} section={section} t={t} />)
        )}
      </div>
    </OverlayPanel>
  );
}
