import type { HTMLAttributes, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import "./OverlayPanel.css";

// docs/conventions/ui-patterns.md §Overlay panels — the full-bleed shell shared by
// StatisticsPanel.tsx, HelpPanel.tsx, and PrintPreviewPanel.tsx. Deliberately no
// backdrop, no Escape-to-close, no role="dialog"/aria-modal (see ui-patterns.md for
// why). Only the outer shell is a component; each consumer supplies its own class for
// internal layout (single-column overflow:auto vs PrintPreviewPanel's sidebar+preview
// flex row) since that varies too much to templatize.
export function OverlayPanel({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  const classes = ["overlay-panel", className].filter(Boolean).join(" ");
  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}

// The title + Close button row, identical across StatisticsPanel and HelpPanel.
// PrintPreviewPanel's own header sits in a narrower sidebar with different sizing
// (13px title vs 15px, 8px vs 10px close padding) — a deliberate context-driven
// difference, not drift, so it keeps its own header markup rather than using this.
export function OverlayPanelHeader({ title, onClose }: { title: ReactNode; onClose: () => void }) {
  const { t } = useTranslation("common");
  return (
    <div className="overlay-panel__header">
      <span className="overlay-panel__title">{title}</span>
      <button className="btn overlay-panel__close" onClick={onClose}>
        {t("actions.close")}
      </button>
    </div>
  );
}
