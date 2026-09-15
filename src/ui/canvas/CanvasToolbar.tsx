import { Grid3x3, Magnet, Maximize, ZoomIn, ZoomOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Tooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";
import type { EditorStore } from "../../application/document";
import { zoomToPercent } from "../../domain/transforms";
import { useEditorState } from "../useEditorStore";
import { CANVAS_VIEWPORT_PX, fitViewportForBoard } from "./boardViewport";
import { zoomInStep, zoomOutStep } from "./zoomSteps";

const VIEWPORT_CENTER = { x: CANVAS_VIEWPORT_PX.width / 2, y: CANVAS_VIEWPORT_PX.height / 2 };
const CANVAS_TOOLBAR_TOOLTIP_ID = "canvas-toolbar-tooltip";

function ToggleChip({ label, active, onClick, icon: Icon }: { label: string; active: boolean; onClick: () => void; icon: typeof Grid3x3 }) {
  return (
    <button
      className={`btn${active ? " btn-active" : ""}`}
      onClick={onClick}
      aria-label={label}
      data-tooltip-id={CANVAS_TOOLBAR_TOOLTIP_ID}
      data-tooltip-content={label}
      style={{ borderRadius: 999, padding: "6px 12px", fontSize: 11.5, fontWeight: 600, gap: 6 }}
    >
      <Icon size={14} />
    </button>
  );
}

// docs/specs/05-canvas-and-viewport.md §Grid + §Zoom and Pan — grid appearance/gap
// controls and viewport zoom, both scoped to the canvas (not document content).
export function CanvasToolbar({ store }: { store: EditorStore }) {
  const { t } = useTranslation("toolbars");
  const state = useEditorState(store);
  const { viewport, grid } = state;

  return (
    <div style={{ flex: "0 0 auto", display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: "1px solid var(--border)" }}>
      <ToggleChip label={grid.visible ? t("canvasToolbar.gridOn") : t("canvasToolbar.gridOff")} active={grid.visible} onClick={() => store.setGrid({ visible: !grid.visible })} icon={Grid3x3} />
      <ToggleChip label={grid.snapEnabled ? t("canvasToolbar.snapOn") : t("canvasToolbar.snapOff")} active={grid.snapEnabled} onClick={() => store.setGrid({ snapEnabled: !grid.snapEnabled })} icon={Magnet} />

      <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-secondary)" }}>
        {t("canvasToolbar.gapX")}
        <input
          type="number"
          className="mono"
          min={0.1}
          step={0.1}
          value={grid.gapX}
          onChange={(e) => store.setGrid({ gapX: Math.max(0.1, Number(e.target.value)) })}
          style={{ width: 52, background: "var(--bg-panel-2)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", padding: "3px 6px", fontSize: 11 }}
        />
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-secondary)" }}>
        {t("canvasToolbar.gapY")}
        <input
          type="number"
          className="mono"
          min={0.1}
          step={0.1}
          value={grid.gapY}
          onChange={(e) => store.setGrid({ gapY: Math.max(0.1, Number(e.target.value)) })}
          style={{ width: 52, background: "var(--bg-panel-2)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", padding: "3px 6px", fontSize: 11 }}
        />
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-secondary)" }}>
        {t("canvasToolbar.gridColour")}
        <input
          type="color"
          value={grid.colour}
          onChange={(e) => store.setGrid({ colour: e.target.value })}
          style={{ width: 24, height: 22, border: "1px solid var(--border)", borderRadius: 4, background: "none", padding: 0 }}
        />
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-secondary)" }}>
        {t("canvasToolbar.gridOpacity")}
        <input
          type="number"
          className="mono"
          min={0}
          max={1}
          step={0.05}
          value={grid.opacity}
          onChange={(e) => store.setGrid({ opacity: Math.min(1, Math.max(0, Number(e.target.value))) })}
          style={{ width: 48, background: "var(--bg-panel-2)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", padding: "3px 6px", fontSize: 11 }}
        />
      </label>

      <div style={{ flex: 1 }} />

      <button aria-label={t("canvasToolbar.zoomOut")} className="btn mono" style={{ borderRadius: 8, padding: "6px 10px", fontSize: 12 }} onClick={() => store.setViewport(zoomOutStep(viewport, VIEWPORT_CENTER))}>
        <ZoomOut size={14} />
      </button>
      <span className="mono" style={{ fontSize: 12, width: 46, textAlign: "center" }}>{Math.round(zoomToPercent(viewport.zoom))}%</span>
      <button aria-label={t("canvasToolbar.zoomIn")} className="btn mono" style={{ borderRadius: 8, padding: "6px 10px", fontSize: 12 }} onClick={() => store.setViewport(zoomInStep(viewport, VIEWPORT_CENTER))}>
        <ZoomIn size={14} />
      </button>
      <button className="btn" style={{ borderRadius: 8, padding: "6px 10px", fontSize: 12, gap: 6 }} onClick={() => store.setViewport(fitViewportForBoard(state.board))}>
        <Maximize size={14} />
        {t("canvasToolbar.fit")}
      </button>
      <Tooltip id={CANVAS_TOOLBAR_TOOLTIP_ID} place="top" />
    </div>
  );
}
