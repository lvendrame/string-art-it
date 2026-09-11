import { LineSegment } from "../paths";
import type { Path, Point } from "../paths";

function vertexAt(center: Point, radius: number, angle: number): Point {
  return { x: center.x + radius * Math.cos(angle), y: center.y + radius * Math.sin(angle) };
}

function toPath(vertices: Point[]): Path {
  const segments = vertices.map((p, i) => new LineSegment(p, vertices[(i + 1) % vertices.length]));
  return { closed: true, segments };
}

// Regular polygon (Pentagon=5, Hexagon=6, Octagon=8, ...) inscribed in a circle of the
// given radius, one LineSegment per edge — pins are distributed per-vertex
// (docs/specs/07-pin-geometry-engine.md §Vertex-Anchored Pin Distribution).
export function regularPolygonShape(center: Point, radius: number, sides: number, rotation = 0): Path {
  if (sides < 3) throw new Error("a polygon needs at least 3 sides");
  const vertices = Array.from({ length: sides }, (_, i) =>
    vertexAt(center, radius, rotation + (2 * Math.PI * i) / sides - Math.PI / 2),
  );
  return toPath(vertices);
}

// Conventional star: `points` outer tips alternating with `points` inner valleys
// (5-point, 6-point, 8-point stars).
export function starShape(
  center: Point,
  outerRadius: number,
  innerRadius: number,
  points: number,
  rotation = 0,
): Path {
  if (points < 3) throw new Error("a star needs at least 3 points");
  const step = Math.PI / points;
  const vertices: Point[] = [];
  for (let i = 0; i < points * 2; i += 1) {
    const angle = rotation + i * step - Math.PI / 2;
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    vertices.push(vertexAt(center, radius, angle));
  }
  return toPath(vertices);
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

// Polygram / star polygon {points/skip} — e.g. pentagram {5,2}, heptagram {7,2},
// octagram {8,3}. Connects every `skip`-th vertex of `points` evenly spaced points,
// producing the correct self-intersecting perimeter (docs/specs/07-pin-geometry-
// engine.md §Geometry Precision — polygram length follows the actual traversal, not
// the convex hull).
export function polygramShape(
  center: Point,
  radius: number,
  points: number,
  skip: number,
  rotation = 0,
): Path {
  if (gcd(points, skip) !== 1) {
    throw new Error(`polygram {${points}/${skip}} is not a single continuous path (gcd != 1)`);
  }
  const anchors = Array.from({ length: points }, (_, i) =>
    vertexAt(center, radius, rotation + (2 * Math.PI * i) / points - Math.PI / 2),
  );
  const order = Array.from({ length: points }, (_, i) => anchors[(i * skip) % points]);
  return toPath(order);
}

export const PENTAGRAM = { points: 5, skip: 2 } as const;
export const HEPTAGRAM = { points: 7, skip: 2 } as const;
export const OCTAGRAM = { points: 8, skip: 3 } as const;
