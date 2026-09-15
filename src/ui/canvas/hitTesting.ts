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

// docs/specs/26-edit-mode-multi-select.md — a rubber-band rectangle in document
// coordinates, normalized (order-independent: the user can drag in any direction).
export interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

function pointInRect(p: Point, r: Rect): boolean {
  const minX = Math.min(r.x0, r.x1);
  const maxX = Math.max(r.x0, r.x1);
  const minY = Math.min(r.y0, r.y1);
  const maxY = Math.max(r.y0, r.y1);
  return p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY;
}

// docs/specs/26-edit-mode-multi-select.md Pin Path granularity rubber-band: a path is
// "touched" if the rect contains any of its real pins OR a symmetry-derived mirrored
// pin belonging to it — same "a mirrored pin's click resolves to its source path" rule
// single-object Select already uses (nearestPinOrMirrorOwner above).
export function pinPathsTouchingRect(pinLayers: PinLayer[], rect: Rect): { layerId: string; pathId: string }[] {
  const touched: { layerId: string; pathId: string }[] = [];
  for (const l of pinLayers) {
    for (const p of l.pinPaths) {
      if (allPinsWithMirrors(p).some((pin) => pointInRect(pin, rect))) {
        touched.push({ layerId: l.id, pathId: p.id });
      }
    }
  }
  return touched;
}

// docs/specs/26-edit-mode-multi-select.md Pins granularity rubber-band: only real,
// stored pins are selectable (mirrors excluded, same restriction the Merge tool's
// pin-picking already had — a pins-mode transform writes directly into pins[], and a
// mirrored pin has no entry there).
export function pinsTouchingRect(pinLayers: PinLayer[], rect: Rect): PinHit[] {
  const touched: PinHit[] = [];
  for (const l of pinLayers) {
    for (const p of l.pinPaths) {
      for (const pin of p.pins) {
        if (pointInRect(pin, rect)) touched.push({ layerId: l.id, pathId: p.id, pinId: pin.id });
      }
    }
  }
  return touched;
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
