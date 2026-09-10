import { LineSegment } from "../paths";
import { regularPolygonShape } from "./polygonFamily";
import type { Path, Point } from "../paths";

// docs/specs/03-board-configuration.md: equilateral triangle is fully described by one
// side length. A regular 3-gon inscribed in radius R has side length R*sqrt(3), so
// R = side / sqrt(3).
export function equilateralTriangleShape(center: Point, side: number, rotation = 0): Path {
  return regularPolygonShape(center, side / Math.sqrt(3), 3, rotation);
}

// Right-angled triangle from base + height; the right angle sits at `origin`. The
// hypotenuse (docs/specs §4.2) is derived, never stored — see rightTriangleHypotenuse.
export function rightTriangleShape(origin: Point, base: number, height: number): Path {
  const a = origin;
  const b: Point = { x: origin.x + base, y: origin.y };
  const c: Point = { x: origin.x, y: origin.y + height };
  return { closed: true, segments: [new LineSegment(a, b), new LineSegment(b, c), new LineSegment(c, a)] };
}

export function rightTriangleHypotenuse(base: number, height: number): number {
  return Math.hypot(base, height);
}
