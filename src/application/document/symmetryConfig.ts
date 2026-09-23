import { generateRadialCopies, mirrorCopies, type MirrorMode } from "@domain/symmetry";
import type { Point } from "@domain/paths";
import type { Pin, PinPath } from "./pinPath";

// docs/specs/06-symmetry.md §54 Symmetry Model — attached per Pin Path, linked to its
// source: regenerating is just re-running this function against the current pins.
export type SymmetryConfig =
  | { type: "none" }
  | { type: Exclude<MirrorMode, "none">; axis: Point }
  | { type: "radial"; centre: Point; intervalDegrees: number };

export const NO_SYMMETRY: SymmetryConfig = { type: "none" };

// docs/specs/34-keyboard-shortcuts.md Shift+S cycle order — shared by SymmetryPanel's
// own type buttons and the keyboard shortcut, so both produce the exact same config
// for a given type (see symmetryConfigForType).
export const SYMMETRY_TYPE_CYCLE: SymmetryConfig["type"][] = ["none", "horizontal", "vertical", "both", "radial"];

// Out-of-the-box config for a given symmetry type — always resets axis/centre/interval
// to their defaults rather than preserving whatever a previous instance of that type
// had (matches SymmetryPanel's pre-existing type-button behaviour exactly).
export function symmetryConfigForType(type: SymmetryConfig["type"]): SymmetryConfig {
  if (type === "none") return { type: "none" };
  if (type === "radial") return { type: "radial", centre: { x: 0, y: 0 }, intervalDegrees: 45 };
  return { type, axis: { x: 0, y: 0 } };
}

// Mirrored/radial copies are DERIVED, never stored — editing the source recalculates
// them automatically because they're recomputed on every read (docs/specs/06-symmetry
// §"Edit source -> Regenerate source pins -> Regenerate mirrored instances"). They are
// not independently selectable Pin Paths (selecting one selects the source, per
// docs/specs/06-symmetry.md §94), but each does get a stable derived id so it can be
// used as a real Thread endpoint — a mirrored pin is a real physical pin on the board.
export function mirroredPinId(sourcePinId: string, groupIndex: number): string {
  return `${sourcePinId}~mirror-${groupIndex}`;
}

export function computeMirroredPinGroups(pinPath: PinPath): Pin[][] {
  const symmetry = pinPath.symmetry;
  if (symmetry.type === "none") return [];
  const points = pinPath.pins.map((p) => ({ x: p.x, y: p.y }));
  const groups: Point[][] =
    symmetry.type === "radial"
      ? generateRadialCopies(points, symmetry.centre, symmetry.intervalDegrees)
      : mirrorCopies(points, symmetry.type, symmetry.axis);
  return groups.map((group, groupIndex) =>
    group.map((pt, i) => ({ id: mirroredPinId(pinPath.pins[i].id, groupIndex), x: pt.x, y: pt.y })),
  );
}

// Every real+addressable pin on a path — the set hit-testing and highlight rendering
// both need, since a mirrored pin is a valid click target and Thread endpoint too.
export function allPinsWithMirrors(pinPath: PinPath): Pin[] {
  return [...pinPath.pins, ...computeMirroredPinGroups(pinPath).flat()];
}

// docs/specs/21-scale-and-pin-distance.md Nearest-Pin Reattachment — Scale and Pin
// distance changes mint entirely fresh pin ids (recomputePinPath), so every old pin
// (real or symmetry-mirrored, since a mirrored pin is a valid Thread endpoint too) is
// mapped to whichever new pin (real or mirrored) sits closest to its old position.
// O(oldPins * newPins) — accepted the same way the Thread nearest-pin lookup is
// (docs/specs/07-pin-geometry-engine.md §Performance), typical pin counts are small.
export function buildNearestPinRemap(oldPath: PinPath, newPath: PinPath): Map<string, string> {
  const oldPins = allPinsWithMirrors(oldPath);
  const newPins = allPinsWithMirrors(newPath);
  const map = new Map<string, string>();
  for (const oldPin of oldPins) {
    let nearest: Pin | undefined;
    let nearestDistSq = Infinity;
    for (const newPin of newPins) {
      const distSq = (newPin.x - oldPin.x) ** 2 + (newPin.y - oldPin.y) ** 2;
      if (distSq < nearestDistSq) {
        nearestDistSq = distSq;
        nearest = newPin;
      }
    }
    if (nearest) map.set(oldPin.id, nearest.id);
  }
  return map;
}
