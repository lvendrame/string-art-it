// docs/specs/26-edit-mode-multi-select.md — pure geometry/algorithm helpers for the
// Edit-mode multi-select feature. No UI/React imports (Clean Architecture boundary,
// docs/specs/01-architecture.md), same as symmetryConfig.ts.
import type { Point } from "@domain/paths";
import { findPinPath, type PinLayer } from "./pinLayer";
import { geometryCenter, nextPinId, type Pin, type PinPath } from "./pinPath";
import type { PinPathRef, PinRef } from "./EditorState";

function meanPoint(points: { x: number; y: number }[]): Point {
  return {
    x: points.reduce((s, p) => s + p.x, 0) / points.length,
    y: points.reduce((s, p) => s + p.y, 0) / points.length,
  };
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// docs/specs/26-edit-mode-multi-select.md — combined pivot for path-mode Rotation
// (the keyboard-driven variant, docs/specs/23-keyboard-transform.md, which already
// pivots on its own centroid rather than a press point) and Scale. Preserves the exact
// single-path centroid formula (docs/specs/21-scale-and-pin-distance.md) when exactly
// one path is selected — so single-selection behaviour stays byte-identical — and uses
// the mean of every real pin across every selected path's pins[] when 2+ paths are
// selected (mirrored/radial derived pins excluded, since they're not what actually
// gets transformed).
export function selectionCentroid(paths: PinPath[]): Point {
  if (paths.length === 1) return geometryCenter(paths[0].geometry);
  return meanPoint(paths.flatMap((p) => p.pins));
}

// Pins-mode pivot — always the mean of the given pins, any count. No legacy
// single-pin special case to preserve: this granularity has no "shape's own centroid"
// concept at all, per docs/specs/26-edit-mode-multi-select.md.
export function pinsCentroid(pins: Pin[]): Point {
  return meanPoint(pins);
}

// A floating-point safety margin only — NOT a visual/UX snap distance. The domain
// layer has no zoom/screen-space context, and a real-world coincidence (e.g. drawing
// snapped to an existing pin) already produces an EXACT position match; this tolerance
// only absorbs trig/scale rounding error from prior transforms.
const MERGE_POSITION_TOLERANCE = 1e-6;

// Union-find clustering of pooled pins within MERGE_POSITION_TOLERANCE of one another.
// Deliberately simple (typical pin counts are small) — same acceptance already applied
// to buildNearestPinRemap's O(n*m) scan in symmetryConfig.ts.
function clusterPins(pins: Pin[]): Pin[][] {
  const parent = new Map<string, string>(pins.map((p) => [p.id, p.id]));
  const find = (id: string): string => {
    let root = id;
    while (parent.get(root) !== root) root = parent.get(root)!;
    return root;
  };
  const union = (a: string, b: string): void => {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) parent.set(rootA, rootB);
  };
  for (let i = 0; i < pins.length; i++) {
    for (let j = i + 1; j < pins.length; j++) {
      if (distance(pins[i], pins[j]) <= MERGE_POSITION_TOLERANCE) union(pins[i].id, pins[j].id);
    }
  }
  const groups = new Map<string, Pin[]>();
  for (const pin of pins) {
    const root = find(pin.id);
    const group = groups.get(root);
    if (group) group.push(pin);
    else groups.set(root, [pin]);
  }
  return [...groups.values()];
}

export interface CombinePinPathsResult {
  pins: Pin[]; // resulting pins[] for the destination (first-selected) path
  remap: Map<string, string>; // every OLD pin id (from every selected path) -> its NEW id
}

// docs/specs/26-edit-mode-multi-select.md path-mode Merge: pool every selected path's
// pins, collapse any that land within MERGE_POSITION_TOLERANCE of one another, and
// remint EVERY surviving pin (colliding or not) a brand-new id — so every original pin
// across every selected path needs to reattach via the returned remap, the same
// mechanism Scale's nearest-pin reattachment already uses (buildNearestPinRemap,
// symmetryConfig.ts). The caller keeps the first-selected path's own id/geometry/
// style/symmetry and just replaces its pins with this result.
export function combinePinPaths(paths: PinPath[]): CombinePinPathsResult {
  const pooled = paths.flatMap((p) => p.pins);
  const clusters = clusterPins(pooled);
  const pins: Pin[] = [];
  const remap = new Map<string, string>();
  for (const cluster of clusters) {
    const newPin: Pin = { id: nextPinId(), ...meanPoint(cluster) };
    pins.push(newPin);
    for (const oldPin of cluster) remap.set(oldPin.id, newPin.id);
  }
  return { pins, remap };
}

function pinPathNumericId(pathId: string): number {
  const match = /-(\d+)$/.exec(pathId);
  return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
}

// docs/specs/26-edit-mode-multi-select.md pins-mode Merge destination rule: whichever
// selected Pin Path contributed the most selected pins; tie -> that path's own
// selected-pins mean position closest to the new pin's position; further tie -> the
// lowest (oldest/first-created) Pin Path id, compared numerically (ids are
// unpadded `pinpath-<n>`, not zero-padded, so lexicographic comparison would be wrong).
export function resolveMergeDestinationPath(pinLayers: PinLayer[], refs: PinRef[], newPinPos: Point): PinPathRef {
  const byPath = new Map<string, { layerId: string; pathId: string; pins: Pin[] }>();
  for (const ref of refs) {
    const key = `${ref.layerId}:${ref.pathId}`;
    const entry = byPath.get(key) ?? { layerId: ref.layerId, pathId: ref.pathId, pins: [] as Pin[] };
    const path = findPinPath(pinLayers, ref.layerId, ref.pathId);
    const pin = path?.pins.find((p) => p.id === ref.pinId);
    if (pin) entry.pins.push(pin);
    byPath.set(key, entry);
  }
  const candidates = [...byPath.values()];
  const maxCount = Math.max(...candidates.map((c) => c.pins.length));
  let tied = candidates.filter((c) => c.pins.length === maxCount);

  if (tied.length > 1) {
    const withDistance = tied.map((c) => ({ c, d: distance(meanPoint(c.pins), newPinPos) }));
    const minD = Math.min(...withDistance.map((x) => x.d));
    tied = withDistance.filter((x) => Math.abs(x.d - minD) < 1e-9).map((x) => x.c);
  }

  if (tied.length > 1) {
    tied = [tied.reduce((a, b) => (pinPathNumericId(a.pathId) <= pinPathNumericId(b.pathId) ? a : b))];
  }

  return { layerId: tied[0].layerId, pathId: tied[0].pathId };
}
