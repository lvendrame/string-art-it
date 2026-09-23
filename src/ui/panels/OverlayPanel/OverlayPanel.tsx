import type { HTMLAttributes } from "react";
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
