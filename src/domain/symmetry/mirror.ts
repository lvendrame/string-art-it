import type { Point } from "../paths";

export function reflectVertical(point: Point, axisX: number): Point {
  return { x: 2 * axisX - point.x, y: point.y };
}

export function reflectHorizontal(point: Point, axisY: number): Point {
  return { x: point.x, y: 2 * axisY - point.y };
}

// docs/specs/06-symmetry.md §9.1: Vertical + Horizontal produces the source plus THREE
// reflected copies (one per remaining quadrant) — vertical-only, horizontal-only, and
// the diagonal (both) combination.
export type MirrorMode = "none" | "vertical" | "horizontal" | "both";

export function mirrorCopies(
  points: Point[],
  mode: MirrorMode,
  axis: { x: number; y: number },
): Point[][] {
  const v = () => points.map((p) => reflectVertical(p, axis.x));
  const h = () => points.map((p) => reflectHorizontal(p, axis.y));
  const vh = () => points.map((p) => reflectHorizontal(reflectVertical(p, axis.x), axis.y));

  switch (mode) {
    case "none":
      return [];
    case "vertical":
      return [v()];
    case "horizontal":
      return [h()];
    case "both":
      return [v(), h(), vh()];
    default:
      return [];
  }
}
