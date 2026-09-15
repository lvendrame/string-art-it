import { useEffect, useRef, useState } from "react";
import { Settings } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { EditorStore } from "../../application/document";
import { useEditorState } from "../useEditorStore";

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
        aria-label={t("canvasToolbar.gridSettings")}
        data-tooltip-id={CANVAS_TOOLBAR_TOOLTIP_ID}
        data-tooltip-content={t("canvasToolbar.gridSettings")}
        onClick={() => setOpen((o) => !o)}
        style={{ borderRadius: 999, padding: "6px 12px", fontSize: 11.5, fontWeight: 600, gap: 6 }}
      >
        <Settings size={14} />
      </button>
      {open && (
        <div
          role="dialog"
          aria-label={t("canvasToolbar.gridSettings")}
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
            minWidth: 160,
            boxShadow: "var(--shadow-float)",
          }}
        >
          <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, fontSize: 11, color: "var(--text-secondary)" }}>
            {t("canvasToolbar.gapX")}
            <input
              type="number"
              className="mono"
              min={0.1}
              step={0.1}
              value={grid.gapX}
              onChange={(e) => store.setGrid({ gapX: Math.max(0.1, Number(e.target.value)) })}
              style={{ width: 60, background: "var(--bg-panel-2)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", padding: "3px 6px", fontSize: 11 }}
            />
          </label>
          <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, fontSize: 11, color: "var(--text-secondary)" }}>
            {t("canvasToolbar.gapY")}
            <input
              type="number"
              className="mono"
              min={0.1}
              step={0.1}
              value={grid.gapY}
              onChange={(e) => store.setGrid({ gapY: Math.max(0.1, Number(e.target.value)) })}
              style={{ width: 60, background: "var(--bg-panel-2)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", padding: "3px 6px", fontSize: 11 }}
            />
          </label>
          <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, fontSize: 11, color: "var(--text-secondary)" }}>
            {t("canvasToolbar.gridColour")}
            <input
              type="color"
              value={grid.colour}
              onChange={(e) => store.setGrid({ colour: e.target.value })}
              style={{ width: 28, height: 22, border: "1px solid var(--border)", borderRadius: 4, background: "none", padding: 0 }}
            />
          </label>
          <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, fontSize: 11, color: "var(--text-secondary)" }}>
            {t("canvasToolbar.gridOpacity")}
            <input
              type="number"
              className="mono"
              min={0}
              max={1}
              step={0.05}
              value={grid.opacity}
              onChange={(e) => store.setGrid({ opacity: Math.min(1, Math.max(0, Number(e.target.value))) })}
              style={{ width: 56, background: "var(--bg-panel-2)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", padding: "3px 6px", fontSize: 11 }}
            />
          </label>
        </div>
      )}
    </div>
  );
}
