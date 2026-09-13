import type { PinLayer } from "./pinLayer";
import type { PinPath } from "./pinPath";

// docs/specs/22-thread-follow-pattern.md — the "Pin N" numbering here is the same
// 1-based position-within-its-own-Pin-Path shown in Print Preview/SVG export, NOT the
// internal stable `Pin.id`. Only matches against `path.pins` (never symmetry-derived
// mirror copies, which live nowhere but a live-recomputed array and have no stable
// position of their own) — so a mirrored pin id simply fails to resolve here, and the
// pattern feature correctly no-ops for it.
export function findPinPosition(layers: PinLayer[], pinId: string): { path: PinPath; index: number } | undefined {
  for (const layer of layers) {
    for (const path of layer.pinPaths) {
      const index = path.pins.findIndex((p) => p.id === pinId);
      if (index !== -1) return { path, index };
    }
  }
  return undefined;
}

// 1-based circular wrap into [1, count].
function wrap(n: number, count: number): number {
  return ((((n - 1) % count) + count) % count) + 1;
}

// docs/specs/22-thread-follow-pattern.md — vertices added to an in-progress thread
// draft are split by position parity (1st/3rd/5th/... vs 2nd/4th/6th/...); the group
// receiving the next vertex is extrapolated from its own last two members' plain
// 1-based pin-position numbers, wrapping around the pin count of whichever Pin Path
// the group's most recent member belongs to. Recomputed fresh from the draft's
// current contents on every call, not fixed once at activation.
export function computeNextPatternPinId(layers: PinLayer[], pinIds: string[]): string | undefined {
  if (pinIds.length < 4) return undefined;

  // Position parity of the vertex about to be added (1-based): odd positions are
  // group 0 (indices 0, 2, 4, ...), even positions are group 1 (indices 1, 3, 5, ...).
  const activeGroupParity = pinIds.length % 2; // next position = length+1; its parity-as-0/1 index
  const group = pinIds.filter((_, i) => i % 2 === activeGroupParity);
  if (group.length < 2) return undefined;

  const secondLastId = group[group.length - 2];
  const lastId = group[group.length - 1];

  const secondLastPos = findPinPosition(layers, secondLastId);
  const lastPos = findPinPosition(layers, lastId);
  if (!secondLastPos || !lastPos) return undefined;

  const secondLastNumber = secondLastPos.index + 1;
  const lastNumber = lastPos.index + 1;
  const step = lastNumber - secondLastNumber;

  const pinCount = lastPos.path.pins.length;
  if (pinCount === 0) return undefined;

  const nextNumber = wrap(lastNumber + step, pinCount);
  return lastPos.path.pins[nextNumber - 1]?.id;
}
