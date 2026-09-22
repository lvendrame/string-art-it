import { useRef, useState } from "react";
import { Settings } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { EditorStore } from "../../application/document";
import { useEditorState } from "../useEditorStore";
import { AnchoredPopover } from "../AnchoredPopover";
import { usePopoverDismiss } from "../usePopoverDismiss";
import "./GridSettingsPopover.css";

// Matches CanvasToolbar.tsx's CANVAS_TOOLBAR_TOOLTIP_ID — this button renders inside
// the same toolbar row, sharing its <Tooltip> instance.
const CANVAS_TOOLBAR_TOOLTIP_ID = "canvas-toolbar-tooltip";

// docs/conventions/ui-patterns.md §Anchored settings popover — same shape as
// ExportMenu.tsx/LanguageSwitcher.tsx: position:relative trigger + absolute panel,
// pointerdown-outside + Escape dismissal (copied from LanguageSwitcher.tsx).
export function GridSettingsPopover({ store }: { store: EditorStore }) {
  const { t } = useTranslation("toolbars");
  const state = useEditorState(store);
  const { grid } = state;
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  usePopoverDismiss(containerRef, open, () => setOpen(false));

  return (
    <div ref={containerRef} className="popover-trigger">
      <button
        type="button"
        className={`btn grid-settings-popover__trigger${open ? " btn-active" : ""}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t("canvasToolbar.gridSettings")}
        data-tooltip-id={CANVAS_TOOLBAR_TOOLTIP_ID}
        data-tooltip-content={t("canvasToolbar.gridSettings")}
        onClick={() => setOpen((o) => !o)}
      >
        <Settings size={14} />
      </button>
      {open && (
        <AnchoredPopover align="left" role="dialog" aria-label={t("canvasToolbar.gridSettings")} className="grid-settings-popover__panel">
          <label className="grid-settings-popover__row">
            {t("canvasToolbar.gapX")}
            <input
              type="number"
              className="mono grid-settings-popover__number-input"
              min={0.1}
              step={0.1}
              value={grid.gapX}
              onChange={(e) => store.setGrid({ gapX: Math.max(0.1, Number(e.target.value)) })}
            />
          </label>
          <label className="grid-settings-popover__row">
            {t("canvasToolbar.gapY")}
            <input
              type="number"
              className="mono grid-settings-popover__number-input"
              min={0.1}
              step={0.1}
              value={grid.gapY}
              onChange={(e) => store.setGrid({ gapY: Math.max(0.1, Number(e.target.value)) })}
            />
          </label>
          <label className="grid-settings-popover__row">
            {t("canvasToolbar.gridColour")}
            <input
              type="color"
              className="grid-settings-popover__color-input"
              value={grid.colour}
              onChange={(e) => store.setGrid({ colour: e.target.value })}
            />
          </label>
          <label className="grid-settings-popover__row">
            {t("canvasToolbar.gridOpacity")}
            <input
              type="number"
              className="mono grid-settings-popover__number-input grid-settings-popover__number-input--opacity"
              min={0}
              max={1}
              step={0.05}
              value={grid.opacity}
              onChange={(e) => store.setGrid({ opacity: Math.min(1, Math.max(0, Number(e.target.value))) })}
            />
          </label>
        </AnchoredPopover>
      )}
    </div>
  );
}
