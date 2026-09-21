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
// two paths' own anchors), not per tool. `circles` only has an effect on a
// same-CLOSED-path pair with `fullFill` on — every other combination ignores it.
export interface TwoPinFillSettings {
  stepA: number;
  stepB: number;
  fullFill: boolean;
  // Zig-zag has no Circles field at all — always effectively 1 (a single ring pass).
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

// Case 1 (same Pin Path): one contiguous range walked from A to B (range[0] === A,
// range[last] === B). Split into two (near-)equal halves — each strided independently
// by the caller's per-side settings — and interleaved to whichever is shorter — mirrored
// (zig-zag) or in original order (parabolic); an odd-length range's true middle pin
// belongs to neither half and is appended alone at the end.
export function buildSameRangeSequence(range: string[], reverseSecond: boolean, settings: TwoPinFillSettings): string[] {
  const n = range.length;
  const halfLen = Math.floor(n / 2);
  const firstHalf = range.slice(0, halfLen);
  const secondHalfRaw = range.slice(n - halfLen);
  const middle = n % 2 === 1 ? [range[halfLen]] : [];
  const bArr = reverseSecond ? [...secondHalfRaw].reverse() : secondHalfRaw;

  const subA = strideList(firstHalf, settings.stepA);
  const subB = strideList(bArr, settings.stepB);
  return [...interleave(subA, subB), ...middle];
}

// Case 2 (different Pin Paths): one run per path, from its own anchor outward,
// interleaved to whichever is shorter — straight (zig-zag) or against the second run
// reversed (parabolic), each side strided independently.
//
// Both raw runs are capped to the SAME length (the shorter of the two) before
// Parabolic's reversal, not after: reversing first and truncating later would drop
// pins off the wrong end (the one nearest B's own anchor, instead of the far end) —
// capping first guarantees the reversed run's own anchor-adjacent pin still lines up
// with runA's anchor-adjacent pin once interleaved, for both tools alike.
export function buildCrossPathSequence(runA: string[], runB: string[], reverseSecond: boolean, settings: TwoPinFillSettings): string[] {
  const len = Math.min(runA.length, runB.length);
  const cappedA = runA.slice(0, len);
  const cappedB = runB.slice(0, len);
  const bArr = reverseSecond ? [...cappedB].reverse() : cappedB;
  const subA = strideList(cappedA, settings.stepA);
  const subB = strideList(bArr, settings.stepB);
  return interleave(subA, subB);
}

export interface TwoPinCandidate {
  dirA: Direction;
  dirB?: Direction; // only meaningful for a Case 2 candidate
  sequence: string[];
  // Additional SEPARATE Thread Paths committed alongside `sequence` — only populated
  // by Case 1 closed-path full-fill (see below). Every ThreadPath is rendered as one
  // continuous connect-the-dots line, so concatenating two independently-built arc
  // sequences into a single `sequence` would draw a spurious straight segment between
  // wherever the first arc happens to end and wherever the second starts (found live:
  // clicking pins 68→1 on a closed ring produced an unwanted long chord where arc 1's
  // zigzag ended). Keeping each arc/circle as its own strand avoids that entirely — a
  // real string-art build already commonly ties off and starts a fresh strand instead
  // of forcing one unbroken thread through unrelated points. Never populated for a
  // candidate sitting in `TwoPinDraft.candidates` (disambiguation only ever applies to
  // single-strand direction/arc choices; full-fill always collapses to exactly one
  // candidate, so this only appears on a candidate that commits immediately).
  extraSequences?: string[][];
}

// Every valid resolution for two anchors on the SAME Pin Path. An open path has
// exactly one (the direction that actually reaches B); a closed path has the two arcs
// between A and B, both sharing endpoints A and B — picking between them (via the 3rd
// click) is about ORDER, not pin coverage, so full-fill doesn't collapse this choice
// away. Returns [] if the pins aren't actually on the same path (or are the same pin)
// — callers use that to fall back to computeCrossPathCandidates.
//
// A closed path + fullFill is the one case with two arcs to choose between (instead of
// a forced single direction) — full-fill uses BOTH arcs instead of picking one via the
// 3rd click, exactly the same "apply the existing algorithm to both options" rule
// Case 2 uses: each arc still runs through the SAME unchanged buildSameRangeSequence
// call the bounded (non-full-fill) case already uses — first pair is still (A,B) in
// EACH arc, zigzagging inward from there. The two arcs commit as SEPARATE Thread Paths
// (`extraSequences`, see TwoPinCandidate) rather than one concatenated sequence — see
// that type's doc comment for why. `settings.circles` repeats the whole arc-pair that
// many times, each repetition its own pair of strands (Parabolic only; Zig-zag has no
// Circles field, so this is always effectively 1 — see docs/specs/35-zigzag-parabolic-
// tools.md §Configuration).
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

  function arcSequence(dir: Direction, arcN: number): string[] {
    const range = extractIds(path, indexA, dir, arcN, closed, groupIndex);
    return buildSameRangeSequence(range, reverseSecond, settings);
  }

  if (!closed) {
    const dir: Direction = indexB > indexA ? 1 : -1;
    return [{ dirA: dir, sequence: arcSequence(dir, Math.abs(indexB - indexA) + 1) }];
  }

  // Two arcs share both endpoints, so their pin counts sum to pinCount + 2.
  const forwardN = (((indexB - indexA) % pinCount) + pinCount) % pinCount + 1;
  const backwardN = pinCount + 2 - forwardN;

  if (closed && settings.fullFill) {
    const circles = Math.max(1, Math.floor(settings.circles ?? 1));
    const strands: string[][] = [];
    for (let c = 0; c < circles; c++) {
      strands.push(arcSequence(1, forwardN));
      if (backwardN !== forwardN) strands.push(arcSequence(-1, backwardN));
    }
    const [sequence, ...extraSequences] = strands;
    return [{ dirA: 1, sequence, extraSequences: extraSequences.length > 0 ? extraSequences : undefined }];
  }

  const candidates = [{ dirA: 1 as Direction, sequence: arcSequence(1, forwardN) }];
  if (backwardN !== forwardN) candidates.push({ dirA: -1, sequence: arcSequence(-1, backwardN) });
  return candidates;
}

// Every viable run from one anchor along its own path. Normally one entry per
// direction — today's existing 2-direction ambiguity when the anchor sits mid-path
// (not at a true endpoint), disambiguated via the 3rd click exactly as it always has
// been. With full-fill on an OPEN path, there's nothing left to disambiguate: the
// anchor's two directions are combined into ONE run (every pin walking dir +1, then
// every pin walking dir -1 minus the duplicated anchor at its front) — eliminates that
// anchor's own direction choice. A CLOSED path already gives either direction the
// FULL ring (remainingInDirection returns pinCount either way), so full-fill changes
// nothing there — both directions stay separate candidates, same as without full-fill
// (their pin SET is already complete either way; only their ORDER differs).
function anchorRuns(path: PinPath, index: number, groupIndex: number, closed: boolean, fullFill: boolean): { dir: Direction; run: string[] }[] {
  if (fullFill && !closed) {
    const posCount = remainingInDirection(path.pins.length, index, 1, closed);
    const negCount = remainingInDirection(path.pins.length, index, -1, closed);
    const pos = extractIds(path, index, 1, posCount, closed, groupIndex);
    const neg = extractIds(path, index, -1, negCount, closed, groupIndex).slice(1);
    return [{ dir: 1, run: [...pos, ...neg] }];
  }
  return ([1, -1] as Direction[])
    .map((dir) => ({ dir, run: extractIds(path, index, dir, remainingInDirection(path.pins.length, index, dir, closed), closed, groupIndex) }))
    .filter((r) => r.run.length >= 1);
}

// Every valid resolution for two anchors on DIFFERENT Pin Paths: each anchor
// independently contributes one run per anchorRuns() above (up to 2×2 = 4
// combinations without full-fill; full-fill collapses each OPEN-path anchor down to
// its own single combined run, so both anchors open ⇒ exactly 1 candidate — no 3rd
// click needed). Interleaving always truncates to whichever run ends up shorter — full-
// fill's completeness comes entirely from anchorRuns() using every reachable pin per
// anchor, not from extending the pairing itself past the shorter run. Duplicate
// resulting sequences collapse to one candidate. Returns [] if the pins are on the same
// path — callers use that to prefer computeSamePathCandidates.
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
  const reverseSecond = reverseSecondFor(tool, false);

  const runsA = anchorRuns(a.path, a.index, a.groupIndex, closedA, settings.fullFill);
  const runsB = anchorRuns(b.path, b.index, b.groupIndex, closedB, settings.fullFill);

  const candidates: TwoPinCandidate[] = [];
  for (const ra of runsA) {
    for (const rb of runsB) {
      candidates.push({ dirA: ra.dir, dirB: rb.dir, sequence: buildCrossPathSequence(ra.run, rb.run, reverseSecond, settings) });
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
