import { useMemo, type MouseEvent as ReactMouseEvent } from "react";
import {
  boardPath,
  DRAG_TOOLS,
  geometryToPath,
  type EditorMode,
  type EditorStore,
  type PinPathGeometry,
} from "../../application/document";
import { pathToSvgD } from "../../infrastructure/rendering/svgPath";
import { zoomToPercent } from "../../domain/transforms";
import { useEditorState } from "../useEditorStore";
import { CANVAS_VIEWPORT_PX } from "./boardViewport";
import { CanvasToolbar } from "./CanvasToolbar";
import { StatusBar } from "./StatusBar";
import { BoardLayer } from "./BoardLayer";
import { GridLayer } from "./GridLayer";
import { GridSnapIndicator } from "./GridSnapIndicator";
import { PinLayersView } from "./PinLayersView";
import { SymmetryOverlay } from "./SymmetryOverlay";
import { ThreadLayersView } from "./ThreadLayersView";
import { ThreadDraftLayer } from "./ThreadDraftLayer";
import { PinHighlightOverlay } from "./PinHighlightOverlay";
import { nearestPinOrMirrorOwner, nearestPinOwner } from "./hitTesting";
import { symmetryPreviewTransforms } from "./symmetryPreviewTransforms";
import { useAltModifier } from "./useAltModifier";
import { useSnappedPointer } from "./useSnappedPointer";
import { usePanInteraction } from "./usePanInteraction";
import { usePinDrawing } from "./usePinDrawing";
import { useFreehandDrawing } from "./useFreehandDrawing";
import { useThreadDrawing } from "./useThreadDrawing";

const VIEWPORT_PX = CANVAS_VIEWPORT_PX;

function canvasCursor(mode: EditorMode, isPanning: boolean): string {
  if (mode === "pan") return isPanning ? "grabbing" : "grab";
  if (mode === "select") return "default";
  return "crosshair";
}

export function Canvas({ store }: { store: EditorStore }) {
  const state = useEditorState(store);
  const { viewport } = state;
  const layerId = state.activePinLayerId;
  const threadLayerId = state.activeThreadLayerId;
  const maxDist = state.snap.radiusPx / viewport.zoom;

  const altHeld = useAltModifier();
  const { cursorDoc, cursorSnapSource, screenToDoc, resolvePoint, updateCursor } =
    useSnappedPointer(state, viewport);
  const pan = usePanInteraction(store);
  const pinDrawing = usePinDrawing(store, layerId);
  const freehandDrawing = useFreehandDrawing(store, layerId);
  const threadDrawing = useThreadDrawing(
    store,
    state,
    threadLayerId,
    cursorDoc,
  );

  const path = useMemo(() => boardPath(state.board), [state.board]);
  const pathD = useMemo(() => pathToSvgD(path), [path]);
  const viewBox = `${viewport.panOrigin.x} ${viewport.panOrigin.y} ${VIEWPORT_PX.width / viewport.zoom} ${VIEWPORT_PX.height / viewport.zoom}`;

  function handlePointerDown(e: ReactMouseEvent<SVGSVGElement>) {
    if (state.mode === "pan") {
      pan.begin(e, viewport);
      return;
    }

    const raw = screenToDoc(e);
    const point = resolvePoint(raw);

    if (state.mode === "select") {
      const hit = nearestPinOrMirrorOwner(state.pinLayers, raw, maxDist);
      store.select(
        hit
          ? { type: "pinPath", layerId: hit.layerId, pathId: hit.pathId }
          : { type: "none" },
      );
      return;
    }

    if (state.mode === "thread") {
      threadDrawing.handleMouseDown(raw, maxDist);
      return;
    }

    if (state.mode !== "pin") return;

    if (state.pinTool === "eraser") {
      const hit = nearestPinOwner(state.pinLayers, raw, maxDist);
      if (hit) store.erasePin(hit.layerId, hit.pathId, hit.pinId);
      return;
    }

    if (state.pinTool === "path-eraser") {
      const hit = nearestPinOwner(state.pinLayers, raw, maxDist);
      if (hit) store.erasePinPath(hit.layerId, hit.pathId);
      return;
    }

    if (state.pinTool === "freehand") {
      freehandDrawing.handleMouseDown(point);
      return;
    }

    pinDrawing.handleMouseDown(point, state.pinTool);
  }

  function handlePointerMove(e: ReactMouseEvent<SVGSVGElement>) {
    if (pan.isPanning) {
      pan.update(e, viewport);
      return;
    }

    const { raw } = updateCursor(e);
    if (state.mode === "thread") threadDrawing.handleMouseMove(raw, maxDist);
    if (state.mode === "pin" && state.pinTool === "freehand") freehandDrawing.handleMouseMove(raw, viewport);
  }

  function handlePointerUp(e: ReactMouseEvent<SVGSVGElement>) {
    if (pan.isPanning) {
      pan.end();
      return;
    }
    if (state.mode === "pin" && state.pinTool === "freehand") {
      freehandDrawing.handleMouseUp();
      return;
    }
    if (state.mode !== "pin" || !DRAG_TOOLS.includes(state.pinTool)) return;
    const point = resolvePoint(screenToDoc(e));
    pinDrawing.handleMouseUp(point, state.pinTool, altHeld);
  }

  // docs/specs/29-ending-cutting-thread
  function handleDoubleClick(e: ReactMouseEvent<SVGSVGElement>) {
    if (state.mode !== "thread") return;
    threadDrawing.handleDoubleClick(screenToDoc(e), maxDist);
  }

  function handleContextMenu(e: ReactMouseEvent<SVGSVGElement>) {
    e.preventDefault();
    if (state.mode !== "thread") return;
    threadDrawing.handleContextMenu();
  }

  const previewGeometry = pinDrawing.previewGeometry(
    state.pinTool,
    cursorDoc,
    altHeld,
  );
  const freehandPreviewGeometry: PinPathGeometry | null =
    state.pinTool === "freehand" && freehandDrawing.points.length >= 2
      ? { type: "freehand", points: freehandDrawing.points }
      : null;
  const activePreviewGeometry = previewGeometry ?? freehandPreviewGeometry;
  const selectedPathId =
    state.selection.type === "pinPath" ? state.selection.pathId : null;
  const activeSymmetry = store.getSelectedPinPath()?.symmetry ?? state.symmetryDefaults;

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        background: "var(--bg-canvas)",
      }}
    >
      <CanvasToolbar store={store} />

      <div
        style={{
          flex: 1,
          position: "relative",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          width={VIEWPORT_PX.width}
          height={VIEWPORT_PX.height}
          viewBox={viewBox}
          style={{ cursor: canvasCursor(state.mode, pan.isPanning) }}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onDoubleClick={handleDoubleClick}
          onContextMenu={handleContextMenu}
          role="img"
          aria-label="Board canvas"
        >
          <BoardLayer board={state.board} pathD={pathD} />

          <GridLayer
            grid={state.grid}
            viewport={viewport}
            viewportPx={VIEWPORT_PX}
          />

          <ThreadLayersView
            threadLayers={state.threadLayers}
            pinLayers={state.pinLayers}
          />

          {/* The in-progress draft paints like a thread, so it stays under pins too. */}
          {state.mode === "thread" && state.threadDraft && (
            <ThreadDraftLayer
              state={state}
              threadDraft={state.threadDraft}
              cursorDoc={cursorDoc}
              threadCandidateId={threadDrawing.threadCandidateId}
            />
          )}

          <PinLayersView
            pinLayers={state.pinLayers}
            selectedPathId={selectedPathId}
          />

          {state.mode === "pin" && (
            <SymmetryOverlay config={activeSymmetry} />
          )}

          {state.mode === "pin" && cursorSnapSource === "grid" && cursorDoc && (
            <GridSnapIndicator point={cursorDoc} />
          )}

          {activePreviewGeometry && (
            <>
              <path
                d={pathToSvgD(geometryToPath(activePreviewGeometry))}
                fill="none"
                stroke="var(--accent)"
                strokeWidth={0.1}
                strokeDasharray="0.3 0.2"
                data-testid="pin-preview"
              />
              {/* docs/specs/06-symmetry.md — mirrored/radial copies appear live while
                  drawing, not only after the shape is committed. */}
              {symmetryPreviewTransforms(activeSymmetry).map((transform, i) => (
                <path
                  key={i}
                  transform={transform}
                  d={pathToSvgD(geometryToPath(activePreviewGeometry))}
                  fill="none"
                  stroke="var(--accent)"
                  strokeOpacity={0.55}
                  strokeWidth={0.1}
                  strokeDasharray="0.3 0.2"
                  data-testid="pin-preview-mirror"
                />
              ))}
            </>
          )}

          {state.mode === "thread" && (
            <PinHighlightOverlay
              pinLayers={state.pinLayers}
              lastPinId={state.threadDraft?.pinIds.at(-1) ?? null}
              threadCandidateId={threadDrawing.threadCandidateId}
              usedPinIds={state.threadDraft?.pinIds.slice(0, -1) ?? []}
            />
          )}
        </svg>
      </div>

      <StatusBar
        mode={state.mode}
        zoomPercent={Math.round(zoomToPercent(viewport.zoom))}
        cursor={cursorDoc}
        pinTool={state.pinTool}
        previewGeometry={activePreviewGeometry}
        spacing={state.pinDefaults.spacing}
        threadStatusText={threadDrawing.statusText}
      />
    </div>
  );
}
