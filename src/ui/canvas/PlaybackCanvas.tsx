import { forwardRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { boardPath, truncateThreadLayersAtFrame, type EditorState } from "../../application/document";
import { pathToSvgD } from "../../infrastructure/rendering/svgPath";
import { CANVAS_VIEWPORT_PX, fitViewportForBoard } from "./boardViewport";
import { BoardLayer } from "./BoardLayer";
import { GridLayer } from "./GridLayer";
import { PinLayersView } from "./PinLayersView";
import { ThreadLayersView } from "./ThreadLayersView";

// docs/specs/19-play-mode.md — read-only replay view: all pins always render, only
// thread segments are frame-gated. Framed statically (fitViewportForBoard), no pan/
// zoom interaction and no pointer handlers at all, unlike the interactive Canvas.
export const PlaybackCanvas = forwardRef<SVGSVGElement, { state: EditorState; frame: number }>(function PlaybackCanvas(
  { state, frame },
  svgRef,
) {
  const { t } = useTranslation("canvas");
  const viewport = useMemo(() => fitViewportForBoard(state.board), [state.board]);
  const path = useMemo(() => boardPath(state.board), [state.board]);
  const pathD = useMemo(() => pathToSvgD(path), [path]);
  const visibleThreadLayers = useMemo(
    () => truncateThreadLayersAtFrame(state.threadLayers, frame),
    [state.threadLayers, frame],
  );
  const viewBox = `${viewport.panOrigin.x} ${viewport.panOrigin.y} ${CANVAS_VIEWPORT_PX.width / viewport.zoom} ${CANVAS_VIEWPORT_PX.height / viewport.zoom}`;

  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-canvas)" }}>
      <svg ref={svgRef} width={CANVAS_VIEWPORT_PX.width} height={CANVAS_VIEWPORT_PX.height} viewBox={viewBox} role="img" aria-label={t("playModeCanvasAriaLabel")}>
        <BoardLayer board={state.board} pathD={pathD} />
        <GridLayer grid={state.grid} viewport={viewport} viewportPx={CANVAS_VIEWPORT_PX} />
        <ThreadLayersView threadLayers={visibleThreadLayers} pinLayers={state.pinLayers} />
        <PinLayersView pinLayers={state.pinLayers} selectedPathId={null} />
      </svg>
    </div>
  );
});
