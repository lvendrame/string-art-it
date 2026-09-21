import type { PinLayer } from "./pinLayer";
import { geometryToPath, type PinPath } from "./pinPath";
import { mirroredPinId } from "./symmetryConfig";
import { findPinPosition } from "./threadPattern";

// docs/specs/35-zigzag-parabolic-tools.md — the shared math behind the Zig-zag and
// Parabolic Thread tools. Both reduce to ONE algorithm (interleave two ordered pin
// sequences, optionally reversing the second) parameterized by a single boolean:
//
//              | Case 1 (same Pin Path) | Case 2 (different Pin Paths) |
//   zig-zag    | reverse second half    | no reverse                   |
//   parabolic  | no reverse             | reverse second run           |
//
// See the spec for the full derivation and worked examples this module reproduces.

export type Direction = 1 | -1;
export type TwoPinTool = "zigzag" | "parabolic";

// docs/specs/35-zigzag-parabolic-tools.md §Configuration — per-draft fill settings.
// `stepA`/`stepB` are independent per SIDE (Case 1: firstHalf/secondHalf; Case 2: the
// two paths' own runs), not per tool. `circles` only has an effect for Parabolic on a
// same-CLOSED-path pair with `fullFill` on — every other combination ignores it.
export interface TwoPinFillSettings {
  stepA: number;
  stepB: number;
  fullFill: boolean;
  // Only meaningful for Parabolic on a same-CLOSED-path pair with fullFill on; absent
  // (Zig-zag has no circles field at all) defaults to 1 — a single full-ring pass.
  circles?: number;
}

function reverseSecondFor(tool: TwoPinTool, sameCase: boolean): boolean {
  return sameCase ? tool === "zigzag" : tool === "parabolic";
}

// "step" pins are skipped between hops, so the stride is step+1: step=0 keeps every
// pin (today's pre-configuration behaviour), step=2 keeps every 3rd. A stride that
// doesn't land exactly on the list's last element simply leaves the remainder unused.
function strideList<T>(list: T[], step: number): T[] {
  const advance = Math.max(0, Math.floor(step)) + 1;
  const out: T[] = [];
  for (let i = 0; i < list.length; i += advance) out.push(list[i]);
  return out;
}

// "text" has no single Path (it's N contours — geometryToPath throws for it), but
// every contour it produces is closed, so a text Pin Path is closed as a whole for the
// purposes of this module's index-wrapping logic.
export function isPathClosed(path: PinPath): boolean {
  return path.geometry.type === "text" ? true : geometryToPath(path.geometry).closed;
}

// How many pins (including the anchor itself) lie in `dir` from `index` within a path
// of `pinCount` pins. A closed path can walk the full loop either way before it would
// repeat a pin, so direction doesn't shrink it; an open path is bounded by whichever
// end `dir` points toward.
export function remainingInDirection(pinCount: number, index: number, dir: Direction, closed: boolean): number {
  if (closed) return pinCount;
  return dir === 1 ? pinCount - index : index + 1;
}

// `count` real pin ids starting at `index`, stepping by `dir`, wrapping mod pinCount
// when `closed` (never runs out of bounds on an open path because every caller caps
// `count` at remainingInDirection first). Re-applies the anchor's own mirror-copy
// transform (`groupIndex`, from findPinPosition — -1 for a real, stored pin) to every
// produced id, the same "stay within this physical instance" rule
// computeNextPatternPinId (docs/specs/22-thread-follow-pattern.md) already uses.
function extractIds(path: PinPath, index: number, dir: Direction, count: number, closed: boolean, groupIndex: number): string[] {
  const n = path.pins.length;
  const ids: string[] = [];
  for (let k = 0; k < count; k++) {
    let idx = index + k * dir;
    if (closed) idx = ((idx % n) + n) % n;
    const pin = path.pins[idx];
    ids.push(groupIndex === -1 ? pin.id : mirroredPinId(pin.id, groupIndex));
  }
  return ids;
}

export function interleave<T>(a: T[], b: T[]): T[] {
  const len = Math.min(a.length, b.length);
  const out: T[] = [];
  for (let i = 0; i < len; i++) out.push(a[i], b[i]);
  return out;
}

// Full-fill (bounded, no wraparound): pair up to the shorter side, then append the
// longer side's own remaining entries solo, in order, until it's exhausted too.
function interleaveFull<T>(a: T[], b: T[]): T[] {
  const len = Math.min(a.length, b.length);
  const out: T[] = [];
  for (let i = 0; i < len; i++) out.push(a[i], b[i]);
  if (a.length > len) out.push(...a.slice(len));
  else if (b.length > len) out.push(...b.slice(len));
  return out;
}

// Case 1 (same Pin Path): one contiguous range walked from A to B (range[0] === A,
// range[last] === B). Split into two (near-)equal halves — each strided independently
// by the caller's per-side settings — and interleaved — mirrored (zig-zag) or in
// original order (parabolic); an odd-length range's true middle pin belongs to neither
// half and is appended alone at the end regardless of striding/full-fill.
export function buildSameRangeSequence(range: string[], reverseSecond: boolean, settings: TwoPinFillSettings): string[] {
  const n = range.length;
  const halfLen = Math.floor(n / 2);
  const firstHalf = range.slice(0, halfLen);
  const secondHalfRaw = range.slice(n - halfLen);
  const middle = n % 2 === 1 ? [range[halfLen]] : [];
  const bArr = reverseSecond ? [...secondHalfRaw].reverse() : secondHalfRaw;

  const subA = strideList(firstHalf, settings.stepA);
  const subB = strideList(bArr, settings.stepB);
  const paired = settings.fullFill ? interleaveFull(subA, subB) : interleave(subA, subB);
  return [...paired, ...middle];
}

// Case 2 (different Pin Paths): one run per path, from its own anchor outward,
// interleaved straight (zig-zag) or against the second run reversed (parabolic), each
// side strided independently. `runA`/`runB` may already be unequal length when the
// caller extracted them uncapped for full-fill (see computeCrossPathCandidates).
export function buildCrossPathSequence(runA: string[], runB: string[], reverseSecond: boolean, settings: TwoPinFillSettings): string[] {
  const bArr = reverseSecond ? [...runB].reverse() : runB;
  const subA = strideList(runA, settings.stepA);
  const subB = strideList(bArr, settings.stepB);
  return settings.fullFill ? interleaveFull(subA, subB) : interleave(subA, subB);
}

export interface TwoPinCandidate {
  dirA: Direction;
  dirB?: Direction; // only meaningful for a Case 2 candidate
  sequence: string[];
}

// Every valid resolution for two anchors on the SAME Pin Path. An open path has
// exactly one (the direction that actually reaches B); a closed path has the two arcs
// between A and B, both sharing endpoints A and B. Returns [] if the pins aren't
// actually on the same path (or are the same pin) — callers use that to fall back to
// computeCrossPathCandidates.
//
// Parabolic + closed path + fullFill is the one case that doesn't just strand/pair the
// bounded A-B arc: it walks the WHOLE ring (pinCount pins, same direction) instead of
// stopping at B, and repeats that full-ring pass `settings.circles` times — "circles"
// has no effect anywhere else (docs/specs/35-zigzag-parabolic-tools.md §Configuration).
export function computeSamePathCandidates(
  layers: PinLayer[],
  firstPinId: string,
  secondPinId: string,
  tool: TwoPinTool,
  settings: TwoPinFillSettings,
): TwoPinCandidate[] {
  const a = findPinPosition(layers, firstPinId);
  const b = findPinPosition(layers, secondPinId);
  if (!a || !b || a.path.id !== b.path.id || a.index === b.index) return [];

  // Captured into locals before the nested function below: TS's narrowing of `a`/`b`
  // from the guard above doesn't extend into a nested function declaration's body.
  const { path, index: indexA, groupIndex } = a;
  const indexB = b.index;
  const closed = isPathClosed(path);
  const pinCount = path.pins.length;
  const reverseSecond = reverseSecondFor(tool, true);
  const ringFill = tool === "parabolic" && closed && settings.fullFill;

  function candidateFor(dir: Direction, arcN: number): TwoPinCandidate {
    const n = ringFill ? pinCount : arcN;
    const range = extractIds(path, indexA, dir, n, closed, groupIndex);
    const onePass = buildSameRangeSequence(range, reverseSecond, settings);
    const sequence = ringFill ? Array.from({ length: Math.max(1, Math.floor(settings.circles ?? 1)) }, () => onePass).flat() : onePass;
    return { dirA: dir, sequence };
  }

  if (!closed) {
    const dir: Direction = indexB > indexA ? 1 : -1;
    return [candidateFor(dir, Math.abs(indexB - indexA) + 1)];
  }

  // Two arcs share both endpoints, so their pin counts sum to pinCount + 2.
  const forwardN = (((indexB - indexA) % pinCount) + pinCount) % pinCount + 1;
  const backwardN = pinCount + 2 - forwardN;
  const candidates = [candidateFor(1, forwardN)];
  if (backwardN !== forwardN) candidates.push(candidateFor(-1, backwardN));
  return candidates;
}

// Every valid resolution for two anchors on DIFFERENT Pin Paths: each anchor
// independently walks in one of two directions, so up to 4 combinations. Without
// full-fill, `L` (the pins actually used per path) is capped by whichever side runs
// out first (remainingInDirection) — the "perfect distribution" is simply using as
// many pins as that direction combination allows. With full-fill, each side is
// extracted uncapped (its own full `remainingInDirection`) so the longer side's tail
// can be appended solo by buildCrossPathSequence once the shorter side is exhausted.
// Duplicate resulting sequences (e.g. both anchors pinned to a single-pin path)
// collapse to one candidate. Returns [] if the pins are on the same path — callers use
// that to prefer computeSamePathCandidates.
export function computeCrossPathCandidates(
  layers: PinLayer[],
  firstPinId: string,
  secondPinId: string,
  tool: TwoPinTool,
  settings: TwoPinFillSettings,
): TwoPinCandidate[] {
  const a = findPinPosition(layers, firstPinId);
  const b = findPinPosition(layers, secondPinId);
  if (!a || !b || a.path.id === b.path.id) return [];

  const closedA = isPathClosed(a.path);
  const closedB = isPathClosed(b.path);
  const nA = a.path.pins.length;
  const nB = b.path.pins.length;
  const reverseSecond = reverseSecondFor(tool, false);

  const candidates: TwoPinCandidate[] = [];
  for (const dirA of [1, -1] as Direction[]) {
    for (const dirB of [1, -1] as Direction[]) {
      const remA = remainingInDirection(nA, a.index, dirA, closedA);
      const remB = remainingInDirection(nB, b.index, dirB, closedB);
      const L = Math.min(remA, remB);
      if (L < 1) continue;
      const extractA = settings.fullFill ? remA : L;
      const extractB = settings.fullFill ? remB : L;
      const runA = extractIds(a.path, a.index, dirA, extractA, closedA, a.groupIndex);
      const runB = extractIds(b.path, b.index, dirB, extractB, closedB, b.groupIndex);
      candidates.push({ dirA, dirB, sequence: buildCrossPathSequence(runA, runB, reverseSecond, settings) });
    }
  }

  const seen = new Set<string>();
  return candidates.filter((c) => {
    const key = c.sequence.join(",");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
