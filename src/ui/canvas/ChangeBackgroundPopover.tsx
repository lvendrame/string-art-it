import { useEffect, useRef, useState } from "react";
import { Wallpaper } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { EditorStore } from "../../application/document";
import { BoardAppearancePanel } from "../panels/BoardAppearancePanel";

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

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <button
        type="button"
        className={`btn${open ? " btn-active" : ""}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t("canvasToolbar.changeBackground")}
        data-tooltip-id={CANVAS_TOOLBAR_TOOLTIP_ID}
        data-tooltip-content={t("canvasToolbar.changeBackground")}
        onClick={() => setOpen((o) => !o)}
        style={{ borderRadius: 999, padding: "6px 12px", fontSize: 11.5, fontWeight: 600, gap: 6 }}
      >
        <Wallpaper size={14} />
      </button>
      {open && (
        <div
          role="dialog"
          aria-label={t("canvasToolbar.changeBackground")}
          style={{
            position: "absolute",
            top: "110%",
            left: 0,
            zIndex: 20,
            background: "var(--bg-panel)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            padding: 10,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            minWidth: 220,
            boxShadow: "var(--shadow-float)",
          }}
        >
          <BoardAppearancePanel store={store} />
        </div>
      )}
    </div>
  );
}
