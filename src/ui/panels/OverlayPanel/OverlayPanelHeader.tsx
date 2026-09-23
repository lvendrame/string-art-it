import type { ReactNode } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@ui/Button";
import "./OverlayPanelHeader.css";

// The title + Close button row, identical across StatisticsPanel and HelpPanel.
// PrintPreviewPanel's own header sits in a narrower sidebar with different sizing
// (13px title vs 15px, size="icon-sm" vs "icon-md" close button) — a deliberate
// context-driven difference, not drift, so it keeps its own header markup rather
// than using this. Both close buttons are icon-only (lucide X): the label moves to
// aria-label so screen readers still get it, matching EditorShell's icon-toolbar-
// button pattern. variant="toggle" is the shared accent-tinted look (see Button.css)
// — this is the way back to the real app, worth more emphasis than a plain neutral
// icon button, but not "primary" (solid fill), since Close isn't the panel's CTA.
export function OverlayPanelHeader({ title, onClose }: { title: ReactNode; onClose: () => void }) {
  const { t } = useTranslation("common");
  return (
    <div className="overlay-panel__header">
      <span className="overlay-panel__title">{title}</span>
      <Button variant="toggle" size="icon-md" onClick={onClose} aria-label={t("actions.close")}>
        <X size={16} />
      </Button>
    </div>
  );
}
