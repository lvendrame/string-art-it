import { percentToZoom, zoomAtPoint, type Viewport } from "../../domain/transforms";
import type { Point } from "../../domain/paths";

// docs/specs/05-canvas-and-viewport.md §Zoom and Pan — shared by CanvasToolbar's
// Zoom In/Out buttons (anchored at the viewport centre) and the radial context menu's
// Pan-mode Zoom In/Out slices (anchored at the right-click point).
export const MIN_ZOOM_PERCENT = 5;
export const MAX_ZOOM_PERCENT = 1600;
const ZOOM_STEP_FACTOR = 1.25;

export function zoomInStep(viewport: Viewport, anchor: Point): Viewport {
  return zoomAtPoint(viewport, Math.min(percentToZoom(MAX_ZOOM_PERCENT), viewport.zoom * ZOOM_STEP_FACTOR), anchor);
}

export function zoomOutStep(viewport: Viewport, anchor: Point): Viewport {
  return zoomAtPoint(viewport, Math.max(percentToZoom(MIN_ZOOM_PERCENT), viewport.zoom / ZOOM_STEP_FACTOR), anchor);
}
