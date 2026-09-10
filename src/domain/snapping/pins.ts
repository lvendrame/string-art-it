import type { Point } from "../paths";

export interface SnapPin extends Point {
  id: string;
}

// docs/specs/23-pin-snap-radius: the radius is screen-space; callers pass
// `maxDocumentDistance` already converted via screenDistanceToDocument (domain/
// transforms) so this function stays free of viewport concerns.
export function findNearestPin(point: Point, pins: SnapPin[], maxDocumentDistance: number): SnapPin | null {
  let nearest: SnapPin | null = null;
  let nearestDistance = Infinity;
  for (const pin of pins) {
    const distance = Math.hypot(pin.x - point.x, pin.y - point.y);
    if (distance <= maxDocumentDistance && distance < nearestDistance) {
      nearest = pin;
      nearestDistance = distance;
    }
  }
  return nearest;
}
