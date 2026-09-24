import { forwardRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { boardPath, truncateThreadLayersAtFrame, type EditorState } from "@application/document";
import { pathToSvgD } from "@infrastructure/rendering/svgPath";
import { fitViewportForBoard } from "./boardViewport";
import { useCanvasViewportSize } from "./canvasViewportSize";
import { BoardLayer } from "./BoardLayer";
import { GridLayer } from "./GridLayer/GridLayer";
import { PinLayersView } from "./PinLayersView";
import { ThreadLayersView } from "./ThreadLayersView";
import "./PlaybackCanvas.css";

// docs/specs/19-play-mode.md — read-only replay view: all pins always render, only
// thread segments are frame-gated. Framed statically (fitViewportForBoard), no pan/
// zoom interaction and no pointer handlers at all, unlike the interactive Canvas.
export const PlaybackCanvas = forwardRef<SVGSVGElement, { state: EditorState; frame: number }>(function PlaybackCanvas(
  { state, frame },
  svgRef,
) {
  const { t } = useTranslation("canvas");
  const viewportPx = useCanvasViewportSize();
  const viewport = useMemo(() => fitViewportForBoard(state.board, viewportPx), [state.board, viewportPx]);
  const path = useMemo(() => boardPath(state.board), [state.board]);
  const pathD = useMemo(() => pathToSvgD(path), [path]);
  const visibleThreadLayers = useMemo(
    () => truncateThreadLayersAtFrame(state.threadLayers, frame),
    [state.threadLayers, frame],
  );
  const viewBox = `${viewport.panOrigin.x} ${viewport.panOrigin.y} ${viewportPx.width / viewport.zoom} ${viewportPx.height / viewport.zoom}`;

  return (
    <div className="playback-canvas">
      <svg ref={svgRef} width="100%" height="100%" viewBox={viewBox} role="img" aria-label={t("playModeCanvasAriaLabel")}>
        <BoardLayer board={state.board} pathD={pathD} />
        <GridLayer grid={state.grid} viewport={viewport} viewportPx={viewportPx} />
        <ThreadLayersView threadLayers={visibleThreadLayers} pinLayers={state.pinLayers} />
        <PinLayersView pinLayers={state.pinLayers} selectedPathIds={[]} />
      </svg>
    </div>
  );
});
