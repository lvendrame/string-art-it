import { percentToZoom, zoomAtPoint, type Viewport } from "../../domain/transforms";
import type { Point } from "../../domain/paths";
import { CANVAS_VIEWPORT_PX } from "./boardViewport";

// docs/specs/05-canvas-and-viewport.md §Zoom and Pan — shared by CanvasToolbar's
// Zoom In/Out buttons (anchored at the viewport centre) and the radial context menu's
// Pan-mode Zoom In/Out slices (anchored at the right-click point).
export const MIN_ZOOM_PERCENT = 5;
export const MAX_ZOOM_PERCENT = 1600;
const ZOOM_STEP_FACTOR = 1.25;

// docs/specs/34-keyboard-shortcuts.md — the anchor point for the bare +/- keyboard
// shortcuts (same "centre of the viewport" anchor CanvasToolbar's own buttons use).
export const VIEWPORT_CENTER: Point = { x: CANVAS_VIEWPORT_PX.width / 2, y: CANVAS_VIEWPORT_PX.height / 2 };

export function zoomInStep(viewport: Viewport, anchor: Point): Viewport {
  return zoomAtPoint(viewport, Math.min(percentToZoom(MAX_ZOOM_PERCENT), viewport.zoom * ZOOM_STEP_FACTOR), anchor);
}

export function zoomOutStep(viewport: Viewport, anchor: Point): Viewport {
  return zoomAtPoint(viewport, Math.max(percentToZoom(MIN_ZOOM_PERCENT), viewport.zoom / ZOOM_STEP_FACTOR), anchor);
}
