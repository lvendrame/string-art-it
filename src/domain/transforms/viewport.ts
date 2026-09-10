import type { Point } from "../paths";
import type { BoundingBox } from "./point";

// docs/specs/05-canvas-and-viewport.md §Physical Coordinate System:
//   Document Coordinates -> Viewport Transform -> Screen Coordinates
// `zoom` is screen pixels per document unit; `panOrigin` is the document-space point
// currently sitting at screen (0,0). Viewport changes never touch document geometry.
export interface Viewport {
  zoom: number;
  panOrigin: Point;
}

export function toScreen(point: Point, viewport: Viewport): Point {
  return {
    x: (point.x - viewport.panOrigin.x) * viewport.zoom,
    y: (point.y - viewport.panOrigin.y) * viewport.zoom,
  };
}

export function toDocument(point: Point, viewport: Viewport): Point {
  return {
    x: point.x / viewport.zoom + viewport.panOrigin.x,
    y: point.y / viewport.zoom + viewport.panOrigin.y,
  };
}

// A screen-space DISTANCE (e.g. the pin snap radius, docs/specs §23) converts to
// document units by dividing by zoom — never a fixed document-unit radius, so
// interaction stays visually constant regardless of zoom level.
export function screenDistanceToDocument(distance: number, viewport: Viewport): number {
  return distance / viewport.zoom;
}

export function fitToViewport(
  box: BoundingBox,
  viewportSize: { width: number; height: number },
  paddingPx = 0,
): Viewport {
  const contentWidth = Math.max(box.maxX - box.minX, 1e-6);
  const contentHeight = Math.max(box.maxY - box.minY, 1e-6);
  const availableWidth = Math.max(viewportSize.width - paddingPx * 2, 1);
  const availableHeight = Math.max(viewportSize.height - paddingPx * 2, 1);
  const zoom = Math.min(availableWidth / contentWidth, availableHeight / contentHeight);

  const contentCenter: Point = { x: (box.minX + box.maxX) / 2, y: (box.minY + box.maxY) / 2 };
  const screenCenter = { x: viewportSize.width / 2, y: viewportSize.height / 2 };
  const panOrigin: Point = {
    x: contentCenter.x - screenCenter.x / zoom,
    y: contentCenter.y - screenCenter.y / zoom,
  };

  return { zoom, panOrigin };
}
