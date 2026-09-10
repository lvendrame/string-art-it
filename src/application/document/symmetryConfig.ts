import { generateRadialCopies, mirrorCopies, type MirrorMode } from "../../domain/symmetry";
import type { Point } from "../../domain/paths";
import type { Pin, PinPath } from "./pinPath";

// docs/specs/06-symmetry.md §54 Symmetry Model — attached per Pin Path, linked to its
// source: regenerating is just re-running this function against the current pins.
export type SymmetryConfig =
  | { type: "none" }
  | { type: Exclude<MirrorMode, "none">; axis: Point }
  | { type: "radial"; centre: Point; intervalDegrees: number };

export const NO_SYMMETRY: SymmetryConfig = { type: "none" };

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
