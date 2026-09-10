import { findPinById, type PinLayer, type ThreadLayer } from "../../application/document";
import type { Point } from "../../domain/paths";

export interface PinHit {
  layerId: string;
  pathId: string;
  pinId: string;
}

export function nearestPinOwner(pinLayers: PinLayer[], point: Point, maxDocDistance: number): PinHit | null {
  let best: PinHit | null = null;
  let bestDist = Infinity;
  for (const l of pinLayers) {
    for (const p of l.pinPaths) {
      for (const pin of p.pins) {
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
}

// docs/specs/31-erasers Thread Eraser: click near any segment removes that whole
// Thread Path (segment-level splitting is a scope reduction — see orchestrator M5).
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
          best = { layerId: l.id, pathId: t.id };
        }
      }
    }
  }
  return best;
}
