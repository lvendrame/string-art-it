import { useEffect } from "react";
import type { EditorState, EditorStore } from "../../application/document";
import type { Point } from "../../domain/paths";

// docs/specs/33-pin-path-tool.md — Path tool click-per-vertex draft: each left click
// extends it (or closes it, if the click lands back on the first vertex); Esc and
// ArrowLeft are global keydown handlers scoped to Pin mode + the Path tool, same shape
// as useThreadDrawing.ts's Escape/ArrowLeft wiring. "Cut"/"Back"/"Cancel" reach the
// same EditorStore methods via the radial context menu instead of keys of their own.
export function usePolygonDrawing(store: EditorStore, state: EditorState, layerId: string) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const current = store.getState();
      if (current.mode !== "pin" || current.pinTool !== "polygon" || !current.polygonDraft) return;
      if (e.key === "Escape") {
        store.escapePolygonDraft(current.activePinLayerId);
      } else if (e.key === "ArrowLeft") {
        store.retractPolygonDraft();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [store]);

  function handleMouseDown(point: Point, maxDist: number): void {
    const draft = state.polygonDraft;
    if (draft && draft.points.length >= 3) {
      const first = draft.points[0];
      if (Math.hypot(point.x - first.x, point.y - first.y) <= maxDist) {
        store.finishPolygonDraft(layerId);
        return;
      }
    }
    store.extendPolygonDraft(point);
  }

  // The first vertex, once there are enough vertices for a click on it to actually
  // close the polygon (docs/specs/33-pin-path-tool.md) — used to render a "click here
  // to close" highlight when the cursor is near it. Not exposed at 1-2 vertices, since
  // closing then would just discard the draft (below the 3-vertex minimum).
  const closeTarget: Point | null = state.polygonDraft && state.polygonDraft.points.length >= 3 ? state.polygonDraft.points[0] : null;

  return { handleMouseDown, closeTarget };
}
