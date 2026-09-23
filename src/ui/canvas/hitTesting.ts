import { allPinsWithMirrors, findPinById, type Pin, type PinLayer, type PinPath, type ThreadLayer } from "@application/document";
import type { Point } from "@domain/paths";

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
// Thread drawing (via nearestThreadInsertionPin below) and Select mode (via
// nearestSelectPathHit below, which resolves a mirrored hit's pathId back to its source
// per §94) must be able to target them too — unlike the Pin Eraser, which only ever
// targets real, stored pins.
export function nearestPinOrMirrorOwner(pinLayers: PinLayer[], point: Point, maxDocDistance: number): PinHit | null {
  return nearestAmongPins(pinLayers, point, maxDocDistance, allPinsWithMirrors);
}

// docs/specs/12-thread-editor.md §Pin Layer Scope for Thread Insertion,
// docs/specs/26-edit-mode-multi-select.md §Pin Layer Scope for Selection — both Thread
// insertion and Edit-mode Select (click/rubber-band, either granularity) only target
// pins on visible Pin Layers, and treat the active Pin Layer as a priority stage: if it
// has a match, that match wins outright — even a farther pin, or a smaller touched set
// — over anything on another visible layer (same shape as 05-canvas-and-viewport.md's
// pin>grid snapping priority — a priority stage wins outright, not on a distance
// tie-break). Only the active layer's own matches are ever mixed with a fallback to the
// *rest* of the visible layers, never both at once.
function visibleLayersPrioritized(pinLayers: PinLayer[], activePinLayerId: string): { active: PinLayer[]; others: PinLayer[] } {
  const visible = pinLayers.filter((l) => l.visible);
  return { active: visible.filter((l) => l.id === activePinLayerId), others: visible.filter((l) => l.id !== activePinLayerId) };
}

export function nearestThreadInsertionPin(pinLayers: PinLayer[], activePinLayerId: string, point: Point, maxDocDistance: number): PinHit | null {
  const { active, others } = visibleLayersPrioritized(pinLayers, activePinLayerId);
  return nearestPinOrMirrorOwner(active, point, maxDocDistance) ?? nearestPinOrMirrorOwner(others, point, maxDocDistance);
}

// Edit-mode Select tool: Pin Path granularity click (mirror-aware, matches
// nearestPinOrMirrorOwner's target set — Move/Rotate/Scale/Merge then only ever act on
// whatever ends up in state.selection, so filtering here is sufficient to keep them off
// hidden-layer objects too).
export function nearestSelectPathHit(pinLayers: PinLayer[], activePinLayerId: string, point: Point, maxDocDistance: number): PinHit | null {
  const { active, others } = visibleLayersPrioritized(pinLayers, activePinLayerId);
  return nearestPinOrMirrorOwner(active, point, maxDocDistance) ?? nearestPinOrMirrorOwner(others, point, maxDocDistance);
}

// Edit-mode Select tool: Pins granularity click (real, stored pins only — same
// restriction nearestPinOwner already has).
export function nearestSelectPinHit(pinLayers: PinLayer[], activePinLayerId: string, point: Point, maxDocDistance: number): PinHit | null {
  const { active, others } = visibleLayersPrioritized(pinLayers, activePinLayerId);
  return nearestPinOwner(active, point, maxDocDistance) ?? nearestPinOwner(others, point, maxDocDistance);
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
// single-object Select already uses (nearestPinOrMirrorOwner/nearestSelectPathHit
// above).
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

// docs/specs/26-edit-mode-multi-select.md §Pin Layer Scope for Selection — rubber-band
// rect-select, Pin Path granularity: only visible layers are touchable, and if the
// active layer has any touched path, only its paths are selected (other visible
// layers' touched paths are dropped, not merged in) — same outright-priority shape as
// the point-based hit tests above, applied to a set instead of a single nearest match.
export function selectablePinPathsTouchingRect(pinLayers: PinLayer[], activePinLayerId: string, rect: Rect): { layerId: string; pathId: string }[] {
  const { active, others } = visibleLayersPrioritized(pinLayers, activePinLayerId);
  const activeTouched = pinPathsTouchingRect(active, rect);
  return activeTouched.length > 0 ? activeTouched : pinPathsTouchingRect(others, rect);
}

// Same priority rule as selectablePinPathsTouchingRect, Pins granularity.
export function selectablePinsTouchingRect(pinLayers: PinLayer[], activePinLayerId: string, rect: Rect): PinHit[] {
  const { active, others } = visibleLayersPrioritized(pinLayers, activePinLayerId);
  const activeTouched = pinsTouchingRect(active, rect);
  return activeTouched.length > 0 ? activeTouched : pinsTouchingRect(others, rect);
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
