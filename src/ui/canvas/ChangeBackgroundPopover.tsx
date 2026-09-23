import { useRef, useState } from "react";
import { Wallpaper } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { EditorStore } from "@application/document";
import { BoardAppearancePanel } from "@ui/panels/BoardAppearancePanel";
import { AnchoredPopover } from "@ui/AnchoredPopover";
import { usePopoverDismiss } from "@ui/usePopoverDismiss";
import "./ChangeBackgroundPopover.css";

// Matches CanvasToolbar.tsx's CANVAS_TOOLBAR_TOOLTIP_ID — this button renders inside
// the same toolbar row, sharing its <Tooltip> instance.
const CANVAS_TOOLBAR_TOOLTIP_ID = "canvas-toolbar-tooltip";

// docs/conventions/ui-patterns.md §Anchored settings popover — copied from
// GridSettingsPopover.tsx. Body is BoardAppearancePanel, already store-driven and
// live-applying (every control calls store.setBoardAppearance directly), so this
// popover needs no state or setters of its own.
export function ChangeBackgroundPopover({ store }: { store: EditorStore }) {
  const { t } = useTranslation("toolbars");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  usePopoverDismiss(containerRef, open, () => setOpen(false));

  return (
    <div ref={containerRef} className="popover-trigger">
      <button
        type="button"
        className={`btn change-background-popover__trigger${open ? " btn-active" : ""}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t("canvasToolbar.changeBackground")}
        data-tooltip-id={CANVAS_TOOLBAR_TOOLTIP_ID}
        data-tooltip-content={t("canvasToolbar.changeBackground")}
        onClick={() => setOpen((o) => !o)}
      >
        <Wallpaper size={14} />
      </button>
      {open && (
        <AnchoredPopover align="left" role="dialog" aria-label={t("canvasToolbar.changeBackground")} className="change-background-popover__panel">
          <BoardAppearancePanel store={store} />
        </AnchoredPopover>
      )}
    </div>
  );
}
