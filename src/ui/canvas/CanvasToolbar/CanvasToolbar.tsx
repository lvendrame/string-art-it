import { Grid3x3, Magnet, Maximize, ZoomIn, ZoomOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Tooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";
import type { EditorStore } from "@application/document";
import { useEditorState } from "@ui/useEditorStore";
import { fitViewportForBoard } from "@ui/canvas/boardViewport";
import { ChangeBackgroundPopover } from "@ui/canvas/ChangeBackgroundPopover";
import { GridSettingsPopover } from "@ui/canvas/GridSettingsPopover";
import { VIEWPORT_CENTER, zoomInStep, zoomOutStep } from "@ui/canvas/zoomSteps";
import { ZoomControl } from "@ui/canvas/ZoomControl";
import { CANVAS_TOOLBAR_TOOLTIP_ID, ToggleChip } from "./ToggleChip";
import "./CanvasToolbar.css";

// docs/specs/05-canvas-and-viewport.md §Grid + §Zoom and Pan — grid appearance/gap
// controls and viewport zoom, both scoped to the canvas (not document content).
export function CanvasToolbar({ store }: { store: EditorStore }) {
  const { t } = useTranslation("toolbars");
  const state = useEditorState(store);
  const { viewport, grid } = state;

  return (
    <div className="canvas-toolbar">
      <ToggleChip label={grid.visible ? t("canvasToolbar.gridOn") : t("canvasToolbar.gridOff")} active={grid.visible} onClick={() => store.setGrid({ visible: !grid.visible })} icon={Grid3x3} />
      <ToggleChip label={grid.snapEnabled ? t("canvasToolbar.snapOn") : t("canvasToolbar.snapOff")} active={grid.snapEnabled} onClick={() => store.setGrid({ snapEnabled: !grid.snapEnabled })} icon={Magnet} />
      <GridSettingsPopover store={store} />
      <ChangeBackgroundPopover store={store} />

      <div className="canvas-toolbar__spacer" />

      <button aria-label={t("canvasToolbar.zoomOut")} className="btn mono canvas-toolbar__zoom-btn" onClick={() => store.setViewport(zoomOutStep(viewport, VIEWPORT_CENTER))}>
        <ZoomOut size={14} />
      </button>
      <ZoomControl store={store} viewport={viewport} />
      <button aria-label={t("canvasToolbar.zoomIn")} className="btn mono canvas-toolbar__zoom-btn" onClick={() => store.setViewport(zoomInStep(viewport, VIEWPORT_CENTER))}>
        <ZoomIn size={14} />
      </button>
      <button className="btn canvas-toolbar__fit-btn" onClick={() => store.setViewport(fitViewportForBoard(state.board))}>
        <Maximize size={14} />
        {t("canvasToolbar.fit")}
      </button>
      <Tooltip id={CANVAS_TOOLBAR_TOOLTIP_ID} place="top" />
    </div>
  );
}
