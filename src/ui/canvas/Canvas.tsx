import { useMemo, type MouseEvent as ReactMouseEvent } from "react";
import {
  boardPath,
  DRAG_TOOLS,
  geometryToPath,
  type EditorMode,
  type EditorStore,
  type PinPathGeometry,
  type PinTool,
  type SelectTool,
  type ThreadTool,
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
import { MergeSelectionOverlay } from "./MergeSelectionOverlay";
import { EraserHoverOverlay } from "./EraserHoverOverlay";
import { nearestPinOrMirrorOwner, nearestPinOwner } from "./hitTesting";
import { symmetryPreviewTransforms } from "./symmetryPreviewTransforms";
import { useAltModifier } from "./useAltModifier";
import { useSnappedPointer } from "./useSnappedPointer";
import { usePanInteraction } from "./usePanInteraction";
import { usePinDrawing } from "./usePinDrawing";
import { useFreehandDrawing } from "./useFreehandDrawing";
import { useThreadDrawing } from "./useThreadDrawing";
import { useMoveTool } from "./useMoveTool";
import { useRotateTool } from "./useRotateTool";
import { useScaleTool } from "./useScaleTool";
import { useMergeTool } from "./useMergeTool";
import { useEraserHover } from "./useEraserHover";

const VIEWPORT_PX = CANVAS_VIEWPORT_PX;

// Data-URI cursors for tools with no matching built-in CSS cursor keyword. Each renders
// the same lucide glyph used on that tool's own toolbar button, as a white-outlined black
// icon for contrast against any board colour, hotspot centred, falling back to the closest
// keyword if data-URI cursors are ever unsupported.
function svgCursor(base64: string, fallback: string): string {
  return `url("data:image/svg+xml;base64,${base64}") 12 12, ${fallback}`;
}

// RotateCw — src/ui/toolbars/SelectToolbar.tsx (Rotate button)
const ROTATE_CURSOR = svgCursor(
  "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIj4KPHBhdGggZD0iTTIxIDEyYTkgOSAwIDEgMS05LTljMi41MiAwIDQuOTMgMSA2Ljc0IDIuNzRMMjEgOCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSI0IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPHBhdGggZD0iTTIxIDN2NWgtNSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSI0IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPHBhdGggZD0iTTIxIDEyYTkgOSAwIDEgMS05LTljMi41MiAwIDQuOTMgMSA2Ljc0IDIuNzRMMjEgOCIgc3Ryb2tlPSJibGFjayIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPHBhdGggZD0iTTIxIDN2NWgtNSIgc3Ryb2tlPSJibGFjayIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+Cg==",
  "grab",
);

// Eraser — src/ui/toolbars/PinToolbar.tsx (Eraser button) and ThreadToolbar.tsx (Eraser button)
const ERASER_CURSOR = svgCursor(
  "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIj4KPHBhdGggZD0iTTIxIDIxSDhhMiAyIDAgMCAxLTEuNDItLjU4N2wtMy45OTQtMy45OTlhMiAyIDAgMCAxIDAtMi44MjhsMTAtMTBhMiAyIDAgMCAxIDIuODI5IDBsNS45OTkgNmEyIDIgMCAwIDEgMCAyLjgyOEwxMi44MzQgMjEiIGZpbGw9Im5vbmUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSI0Ii8+CjxwYXRoIGQ9Im01LjA4MiAxMS4wOSA4LjgyOCA4LjgyOCIgZmlsbD0ibm9uZSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjQiLz4KPHBhdGggZD0iTTIxIDIxSDhhMiAyIDAgMCAxLTEuNDItLjU4N2wtMy45OTQtMy45OTlhMiAyIDAgMCAxIDAtMi44MjhsMTAtMTBhMiAyIDAgMCAxIDIuODI5IDBsNS45OTkgNmEyIDIgMCAwIDEgMCAyLjgyOEwxMi44MzQgMjEiIGZpbGw9Im5vbmUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlPSJibGFjayIgc3Ryb2tlLXdpZHRoPSIyIi8+CjxwYXRoIGQ9Im01LjA4MiAxMS4wOSA4LjgyOCA4LjgyOCIgZmlsbD0ibm9uZSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2U9ImJsYWNrIiBzdHJva2Utd2lkdGg9IjIiLz4KPC9zdmc+",
  "cell",
);

// Trash2 — src/ui/toolbars/PinToolbar.tsx (Path Eraser button)
const TRASH_CURSOR = svgCursor(
  "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIj4KPHBhdGggZD0iTTEwIDExdjYiIGZpbGw9Im5vbmUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSI0Ii8+CjxwYXRoIGQ9Ik0xNCAxMXY2IiBmaWxsPSJub25lIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iNCIvPgo8cGF0aCBkPSJNMTkgNnYxNGEyIDIgMCAwIDEtMiAySDdhMiAyIDAgMCAxLTItMlY2IiBmaWxsPSJub25lIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iNCIvPgo8cGF0aCBkPSJNMyA2aDE4IiBmaWxsPSJub25lIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iNCIvPgo8cGF0aCBkPSJNOCA2VjRhMiAyIDAgMCAxIDItMmg0YTIgMiAwIDAgMSAyIDJ2MiIgZmlsbD0ibm9uZSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjQiLz4KPHBhdGggZD0iTTEwIDExdjYiIGZpbGw9Im5vbmUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlPSJibGFjayIgc3Ryb2tlLXdpZHRoPSIyIi8+CjxwYXRoIGQ9Ik0xNCAxMXY2IiBmaWxsPSJub25lIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZT0iYmxhY2siIHN0cm9rZS13aWR0aD0iMiIvPgo8cGF0aCBkPSJNMTkgNnYxNGEyIDIgMCAwIDEtMiAySDdhMiAyIDAgMCAxLTItMlY2IiBmaWxsPSJub25lIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZT0iYmxhY2siIHN0cm9rZS13aWR0aD0iMiIvPgo8cGF0aCBkPSJNMyA2aDE4IiBmaWxsPSJub25lIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZT0iYmxhY2siIHN0cm9rZS13aWR0aD0iMiIvPgo8cGF0aCBkPSJNOCA2VjRhMiAyIDAgMCAxIDItMmg0YTIgMiAwIDAgMSAyIDJ2MiIgZmlsbD0ibm9uZSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2U9ImJsYWNrIiBzdHJva2Utd2lkdGg9IjIiLz4KPC9zdmc+",
  "cell",
);

// Scissors — src/ui/toolbars/ThreadToolbar.tsx (Segment Eraser button)
const SCISSORS_CURSOR = svgCursor(
  "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIj4KPGNpcmNsZSBjeD0iNiIgY3k9IjYiIHI9IjMiIGZpbGw9Im5vbmUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSI0Ii8+CjxwYXRoIGQ9Ik04LjEyIDguMTIgMTIgMTIiIGZpbGw9Im5vbmUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSI0Ii8+CjxwYXRoIGQ9Ik0yMCA0IDguMTIgMTUuODgiIGZpbGw9Im5vbmUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSI0Ii8+CjxjaXJjbGUgY3g9IjYiIGN5PSIxOCIgcj0iMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjQiLz4KPHBhdGggZD0iTTE0LjggMTQuOCAyMCAyMCIgZmlsbD0ibm9uZSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjQiLz4KPGNpcmNsZSBjeD0iNiIgY3k9IjYiIHI9IjMiIGZpbGw9Im5vbmUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlPSJibGFjayIgc3Ryb2tlLXdpZHRoPSIyIi8+CjxwYXRoIGQ9Ik04LjEyIDguMTIgMTIgMTIiIGZpbGw9Im5vbmUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlPSJibGFjayIgc3Ryb2tlLXdpZHRoPSIyIi8+CjxwYXRoIGQ9Ik0yMCA0IDguMTIgMTUuODgiIGZpbGw9Im5vbmUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlPSJibGFjayIgc3Ryb2tlLXdpZHRoPSIyIi8+CjxjaXJjbGUgY3g9IjYiIGN5PSIxOCIgcj0iMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2U9ImJsYWNrIiBzdHJva2Utd2lkdGg9IjIiLz4KPHBhdGggZD0iTTE0LjggMTQuOCAyMCAyMCIgZmlsbD0ibm9uZSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2U9ImJsYWNrIiBzdHJva2Utd2lkdGg9IjIiLz4KPC9zdmc+",
  "crosshair",
);

const SELECT_TOOL_CURSORS: Record<SelectTool, string> = {
  select: "default",
  move: "move",
  rotate: ROTATE_CURSOR,
  scale: "ew-resize",
  merge: "default",
};

const PIN_TOOL_CURSORS: Record<PinTool, string> = {
  line: "crosshair",
  arc: "crosshair",
  ellipse: "crosshair",
  circle: "crosshair",
  rectangle: "crosshair",
  square: "crosshair",
  pentagon: "crosshair",
  hexagon: "crosshair",
  octagon: "crosshair",
  "star-5": "crosshair",
  "star-6": "crosshair",
  "star-8": "crosshair",
  pentagram: "crosshair",
  heptagram: "crosshair",
  octagram: "crosshair",
  freehand: "crosshair",
  eraser: ERASER_CURSOR,
  "path-eraser": TRASH_CURSOR,
};

const THREAD_TOOL_CURSORS: Record<ThreadTool, string> = {
  draw: "crosshair",
  eraser: ERASER_CURSOR,
  "segment-eraser": SCISSORS_CURSOR,
};

function canvasCursor(
  mode: EditorMode,
  selectTool: SelectTool,
  pinTool: PinTool,
  threadTool: ThreadTool,
  isPanning: boolean,
): string {
  if (mode === "pan") return isPanning ? "grabbing" : "grab";
  if (mode === "select") return SELECT_TOOL_CURSORS[selectTool];
  if (mode === "pin") return PIN_TOOL_CURSORS[pinTool];
  if (mode === "thread") return THREAD_TOOL_CURSORS[threadTool];
  return "default";
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
  const moveTool = useMoveTool(store, state);
  const rotateTool = useRotateTool(store, state);
  const scaleTool = useScaleTool(store, state);
  const mergeTool = useMergeTool(store, state);
  const eraserHover = useEraserHover(state);

  const path = useMemo(() => boardPath(state.board), [state.board]);
  const pathD = useMemo(() => pathToSvgD(path), [path]);
  const viewBox = `${viewport.panOrigin.x} ${viewport.panOrigin.y} ${VIEWPORT_PX.width / viewport.zoom} ${VIEWPORT_PX.height / viewport.zoom}`;

  function handlePointerDown(e: ReactMouseEvent<SVGSVGElement>) {
    // Only the primary (left) button starts a drawing/drag/select/accumulate gesture —
    // a right-click is exclusively for the context-menu actions below (Thread finish,
    // Merge commit). Without this guard, right-clicking directly on an already-
    // selected Merge candidate would toggle it off via this handler a moment before
    // handleContextMenu commits, silently dropping it from the merge.
    if (e.button !== 0) return;
    if (state.mode === "pan") {
      pan.begin(e, viewport);
      return;
    }

    const raw = screenToDoc(e);
    const point = resolvePoint(raw);

    if (state.mode === "select") {
      if (state.selectTool === "select") {
        const hit = nearestPinOrMirrorOwner(state.pinLayers, raw, maxDist);
        store.select(
          hit
            ? { type: "pinPath", layerId: hit.layerId, pathId: hit.pathId }
            : { type: "none" },
        );
      } else if (state.selectTool === "move" && state.selection.type === "pinPath") {
        moveTool.handleMouseDown(point);
      } else if (state.selectTool === "rotate" && state.selection.type === "pinPath") {
        rotateTool.handleMouseDown(point, e.clientX);
      } else if (state.selectTool === "scale" && state.selection.type === "pinPath") {
        scaleTool.handleMouseDown(e.clientX);
      } else if (state.selectTool === "merge") {
        mergeTool.handleMouseDown(raw, maxDist);
      }
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
    if (state.mode === "select" && state.selectTool === "move") moveTool.handleMouseMove(resolvePoint(raw));
    if (state.mode === "select" && state.selectTool === "rotate") rotateTool.handleMouseMove(resolvePoint(raw), e.clientX);
    if (state.mode === "select" && state.selectTool === "scale") scaleTool.handleMouseMove(e.clientX);
    if (state.mode === "select" && state.selectTool === "merge") mergeTool.handleMouseMove(raw, maxDist);
    if (state.mode === "pin") eraserHover.handlePinMouseMove(raw, maxDist, state.pinTool);
    if (state.mode === "thread") eraserHover.handleThreadMouseMove(raw, maxDist, state.threadTool);
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
    if (state.mode === "select" && state.selectTool === "move") {
      moveTool.handleMouseUp(resolvePoint(screenToDoc(e)));
      return;
    }
    if (state.mode === "select" && state.selectTool === "rotate") {
      rotateTool.handleMouseUp(resolvePoint(screenToDoc(e)), e.clientX);
      return;
    }
    if (state.mode === "select" && state.selectTool === "scale") {
      scaleTool.handleMouseUp(e.clientX);
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
    if (state.mode === "thread") threadDrawing.handleContextMenu();
    else if (state.mode === "select" && state.selectTool === "merge") mergeTool.handleContextMenu();
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
          style={{
            cursor: canvasCursor(state.mode, state.selectTool, state.pinTool, state.threadTool, pan.isPanning),
          }}
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

          {state.mode === "select" && state.selectTool === "merge" && (
            <MergeSelectionOverlay
              pinLayers={state.pinLayers}
              selectedPinIds={state.mergeSelection.map((c) => c.pinId)}
              hoverPinId={mergeTool.hoverPinId}
            />
          )}

          {((state.mode === "pin" && (state.pinTool === "eraser" || state.pinTool === "path-eraser")) ||
            (state.mode === "thread" && (state.threadTool === "eraser" || state.threadTool === "segment-eraser"))) && (
            <EraserHoverOverlay
              pinLayers={state.pinLayers}
              threadLayers={state.threadLayers}
              pinEraserHit={state.mode === "pin" ? eraserHover.pinEraserHit : null}
              pathEraserHit={state.mode === "pin" ? eraserHover.pathEraserHit : null}
              threadEraserHit={state.mode === "thread" ? eraserHover.threadEraserHit : null}
              segmentEraserHit={state.mode === "thread" ? eraserHover.segmentEraserHit : null}
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
