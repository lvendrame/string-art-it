import { Grid3x3, Magnet, Maximize, ZoomIn, ZoomOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Tooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";
import type { EditorStore } from "../../application/document";
import { useEditorState } from "../useEditorStore";
import { fitViewportForBoard } from "./boardViewport";
import { ChangeBackgroundPopover } from "./ChangeBackgroundPopover";
import { GridSettingsPopover } from "./GridSettingsPopover";
import { VIEWPORT_CENTER, zoomInStep, zoomOutStep } from "./zoomSteps";
import { ZoomControl } from "./ZoomControl";

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
      <GridSettingsPopover store={store} />
      <ChangeBackgroundPopover store={store} />

      <div style={{ flex: 1 }} />

      <button aria-label={t("canvasToolbar.zoomOut")} className="btn mono" style={{ borderRadius: 8, padding: "6px 10px", fontSize: 12 }} onClick={() => store.setViewport(zoomOutStep(viewport, VIEWPORT_CENTER))}>
        <ZoomOut size={14} />
      </button>
      <ZoomControl store={store} viewport={viewport} />
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
