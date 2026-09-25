import { useMemo, useState, type MouseEvent as ReactMouseEvent } from "react";
import type { EditorState } from "@application/document";
import { resolveSnapPosition, type SnapPin, type SnapResult } from "@domain/snapping";
import type { Point } from "@domain/paths";
import { toDocument, type Viewport } from "@domain/transforms";

// Translates raw mouse events into document coordinates and applies the snap pipeline
// (docs/specs/22-snapping-priority), while tracking the live cursor position for
// status-bar/preview rendering. The snapped cursor is derived from the raw one on every
// render so a modifier change (e.g. centre snap) takes effect without a mouse move.
export function useSnappedPointer(state: EditorState, viewport: Viewport, centerSnap: Point | null = null) {
  const [rawCursor, setRawCursor] = useState<Point | null>(null);

  const allPins: SnapPin[] = useMemo(
    () => state.pinLayers.flatMap((l) => l.pinPaths.flatMap((p) => p.pins)),
    [state.pinLayers],
  );

  function screenToDoc(e: ReactMouseEvent<SVGSVGElement>): Point {
    const rect = e.currentTarget.getBoundingClientRect();
    return toDocument({ x: e.clientX - rect.left, y: e.clientY - rect.top }, viewport);
  }

  function resolveSnap(raw: Point): SnapResult {
    return resolveSnapPosition(raw, {
      pins: allPins,
      pinSnapEnabled: state.snap.pinSnapEnabled,
      snapRadiusPx: state.snap.radiusPx,
      gridSnapEnabled: state.grid.snapEnabled,
      gridGap: { x: state.grid.gapX, y: state.grid.gapY },
      viewport,
      centerSnap,
    });
  }

  function resolvePoint(raw: Point): Point {
    return resolveSnap(raw).point;
  }

  function updateCursor(e: ReactMouseEvent<SVGSVGElement>): { raw: Point; point: Point } {
    const raw = screenToDoc(e);
    setRawCursor(raw);
    return { raw, point: resolvePoint(raw) };
  }

  const cursorSnap = rawCursor ? resolveSnap(rawCursor) : null;
  const cursorDoc = cursorSnap?.point ?? null;
  const cursorSnapSource = cursorSnap?.source ?? null;

  return { cursorDoc, cursorSnapSource, screenToDoc, resolvePoint, updateCursor };
}
