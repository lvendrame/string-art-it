import type { Point } from "../paths";

export function rotateAround(point: Point, center: Point, radians: number): Point {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return { x: center.x + dx * cos - dy * sin, y: center.y + dx * sin + dy * cos };
}

// docs/specs/06-symmetry.md §9.2: interval in degrees (preset or custom), centre
// movable (defaults to board centre — the caller supplies it). Returns one array of
// transformed points per COPY, excluding the source itself — e.g. interval 45 ->
// 7 copies (8 total instances including the source).
export function generateRadialCopies(points: Point[], center: Point, intervalDegrees: number): Point[][] {
  if (intervalDegrees <= 0) throw new Error("radial interval must be positive");
  const copies: Point[][] = [];
  for (let angleDeg = intervalDegrees; angleDeg < 360; angleDeg += intervalDegrees) {
    const radians = (angleDeg * Math.PI) / 180;
    copies.push(points.map((p) => rotateAround(p, center, radians)));
  }
  return copies;
}
