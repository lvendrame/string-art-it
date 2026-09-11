import { allPinsWithMirrors, findPinById, type Pin, type PinLayer, type PinPath, type ThreadLayer } from "../../application/document";
import type { Point } from "../../domain/paths";

export interface PinHit {
  layerId: string;
  pathId: string;
  pinId: string;
}

function nearestAmongPins(pinLayers: PinLayer[], point: Point, maxDocDistance: number, pinsOf: (path: PinPath) => Pin[]): PinHit | null {
  let best: PinHit | null = null;
  let bestDist = Infinity;
  for (const l of pinLayers) {
    for (const p of l.pinPaths) {
      for (const pin of pinsOf(p)) {
        const d = Math.hypot(pin.x - point.x, pin.y - point.y);
        if (d <= maxDocDistance && d < bestDist) {
          bestDist = d;
          best = { layerId: l.id, pathId: p.id, pinId: pin.id };
        }
      }
    }
  }
  return best;
}

export function nearestPinOwner(pinLayers: PinLayer[], point: Point, maxDocDistance: number): PinHit | null {
  return nearestAmongPins(pinLayers, point, maxDocDistance, (p) => p.pins);
}

// docs/specs/06-symmetry.md: mirrored pins are real physical pins on the board, so
// Thread drawing (and select-mode, which resolves a mirrored hit's pathId back to its
// source per §94) must be able to target them too — unlike the Pin Eraser, which only
// ever targets real, stored pins.
export function nearestPinOrMirrorOwner(pinLayers: PinLayer[], point: Point, maxDocDistance: number): PinHit | null {
  return nearestAmongPins(pinLayers, point, maxDocDistance, allPinsWithMirrors);
}

function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

export interface ThreadHit {
  layerId: string;
  pathId: string;
  segmentIndex: number;
}

// docs/specs/11-erasers.md — shared hit test for both the Path Eraser (deletes the
// whole Thread Path) and the Segment Eraser (deletes just the clicked segment, which
// needs the winning segmentIndex, not just the path).
export function nearestThreadPath(threadLayers: ThreadLayer[], pinLayers: PinLayer[], point: Point, maxDocDistance: number): ThreadHit | null {
  let best: ThreadHit | null = null;
  let bestDist = Infinity;
  for (const l of threadLayers) {
    for (const t of l.threadPaths) {
      for (let i = 0; i < t.pinIds.length - 1; i += 1) {
        const a = findPinById(pinLayers, t.pinIds[i]);
        const b = findPinById(pinLayers, t.pinIds[i + 1]);
        if (!a || !b) continue;
        const d = distanceToSegment(point, a, b);
        if (d <= maxDocDistance && d < bestDist) {
          bestDist = d;
          best = { layerId: l.id, pathId: t.id, segmentIndex: i };
        }
      }
    }
  }
  return best;
}
