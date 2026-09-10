import { generateRadialCopies, mirrorCopies, type MirrorMode } from "../../domain/symmetry";
import type { Point } from "../../domain/paths";
import type { PinPath } from "./pinPath";

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
// visual only: not independently selectable Pin Paths, not connectable pins for
// threads (M5) — see docs/plan/orchestrator.md M4 scope note.
export function computeMirroredPinGroups(pinPath: PinPath): Point[][] {
  const points = pinPath.pins.map((p) => ({ x: p.x, y: p.y }));
  const symmetry = pinPath.symmetry;
  if (symmetry.type === "none") return [];
  if (symmetry.type === "radial") return generateRadialCopies(points, symmetry.centre, symmetry.intervalDegrees);
  return mirrorCopies(points, symmetry.type, symmetry.axis);
}
