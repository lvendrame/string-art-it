import { percentToZoom, zoomAtPoint, type Viewport } from "@domain/transforms";
import type { Point } from "@domain/paths";
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

// docs/specs/05-canvas-and-viewport.md §Zoom and Pan — the CanvasToolbar zoom
// control's typed-value/preset-dropdown paths. Same clamp + anchor behaviour as
// zoomInStep/zoomOutStep so all four ways of changing zoom (buttons, +/- keys,
// dropdown pick, typed value) stay consistent.
export function zoomToPercentStep(viewport: Viewport, percent: number, anchor: Point): Viewport {
  const clamped = Math.min(MAX_ZOOM_PERCENT, Math.max(MIN_ZOOM_PERCENT, percent));
  return zoomAtPoint(viewport, percentToZoom(clamped), anchor);
}

export const ZOOM_PRESET_PERCENTS = [10, 25, 50, 75, 100, 150, 200, 300, 400, 800, 1600];
