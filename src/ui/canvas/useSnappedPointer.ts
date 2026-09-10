import { useMemo, useState, type MouseEvent as ReactMouseEvent } from "react";
import type { EditorState } from "../../application/document";
import { resolveSnapPosition, type SnapPin } from "../../domain/snapping";
import type { Point } from "../../domain/paths";
import { toDocument, type Viewport } from "../../domain/transforms";

// Translates raw mouse events into document coordinates and applies the snap pipeline
// (docs/specs/22-snapping-priority), while tracking the live cursor position for
// status-bar/preview rendering.
export function useSnappedPointer(state: EditorState, viewport: Viewport) {
  const [cursorDoc, setCursorDoc] = useState<Point | null>(null);

  const allPins: SnapPin[] = useMemo(
    () => state.pinLayers.flatMap((l) => l.pinPaths.flatMap((p) => p.pins)),
    [state.pinLayers],
  );

  function screenToDoc(e: ReactMouseEvent<SVGSVGElement>): Point {
    const rect = e.currentTarget.getBoundingClientRect();
    return toDocument({ x: e.clientX - rect.left, y: e.clientY - rect.top }, viewport);
  }

  function resolvePoint(raw: Point): Point {
    const result = resolveSnapPosition(raw, {
      pins: allPins,
      pinSnapEnabled: state.snap.pinSnapEnabled,
      snapRadiusPx: state.snap.radiusPx,
      gridSnapEnabled: state.grid.snapEnabled,
      gridGap: { x: state.grid.gapX, y: state.grid.gapY },
      viewport,
    });
    return result.point;
  }

  function updateCursor(e: ReactMouseEvent<SVGSVGElement>): { raw: Point; point: Point } {
    const raw = screenToDoc(e);
    const point = resolvePoint(raw);
    setCursorDoc(point);
    return { raw, point };
  }

  return { cursorDoc, screenToDoc, resolvePoint, updateCursor };
}
