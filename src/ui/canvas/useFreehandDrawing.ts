import { useState } from "react";
import type { EditorStore } from "../../application/document";
import type { Point } from "../../domain/paths";
import { screenDistanceToDocument, type Viewport } from "../../domain/transforms";

const MIN_POINT_DISTANCE_PX = 3;

// Freehand pin drawing: click-drag to hand-draw an arbitrary Pin Path. A distinct
// interaction pattern from the click-based/bbox-drag tools in usePinDrawing.ts — this
// is a continuous point capture, so it owns its own hook. Points are raw cursor
// positions (no mid-gesture snapping — snapping every sampled point would turn a
// smooth gesture into a staircase); only the starting point is snap-resolved by the
// caller before handleMouseDown is called, same as every other pin tool.
export function useFreehandDrawing(store: EditorStore, layerId: string) {
  const [points, setPoints] = useState<Point[]>([]);

  function handleMouseDown(point: Point): void {
    setPoints([point]);
  }

  function handleMouseMove(rawPoint: Point, viewport: Viewport): void {
    setPoints((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      const minDocDistance = screenDistanceToDocument(MIN_POINT_DISTANCE_PX, viewport);
      const distance = Math.hypot(rawPoint.x - last.x, rawPoint.y - last.y);
      if (distance < minDocDistance) return prev;
      return [...prev, rawPoint];
    });
  }

  function handleMouseUp(): void {
    if (points.length >= 2) store.addPinPath(layerId, { type: "freehand", points });
    setPoints([]);
  }

  return { isDrawing: points.length > 0, points, handleMouseDown, handleMouseMove, handleMouseUp };
}
