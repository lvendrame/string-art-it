import type { Point } from "../paths";
import { screenDistanceToDocument, type Viewport } from "../transforms";
import { snapToGrid, type GridGap } from "./grid";
import { findNearestPin, type SnapPin } from "./pins";

export interface SnapOptions {
  pins: SnapPin[];
  pinSnapEnabled: boolean;
  snapRadiusPx: number;
  gridSnapEnabled: boolean;
  gridGap: GridGap;
  viewport: Viewport;
}

export type SnapResult =
  | { point: Point; source: "pin"; pin: SnapPin }
  | { point: Point; source: "grid" }
  | { point: Point; source: "raw" };

// docs/specs/22-snapping-priority (deterministic, fixed order):
//   Raw pointer -> Nearest pin/object snap -> Grid snap -> (geometry constraint,
//   mirror/symmetry — tool-specific, applied by the caller after this).
// Grid visibility and snap-to-grid are independent settings (docs/specs/07-grid) —
// this function only reads `gridSnapEnabled`, never grid visibility.
export function resolveSnapPosition(rawPoint: Point, options: SnapOptions): SnapResult {
  if (options.pinSnapEnabled) {
    const maxDocumentDistance = screenDistanceToDocument(options.snapRadiusPx, options.viewport);
    const pin = findNearestPin(rawPoint, options.pins, maxDocumentDistance);
    if (pin) return { point: { x: pin.x, y: pin.y }, source: "pin", pin };
  }

  if (options.gridSnapEnabled) {
    return { point: snapToGrid(rawPoint, options.gridGap), source: "grid" };
  }

  return { point: rawPoint, source: "raw" };
}
