import { pathLength, pointAtDistance } from "./Path";
import type { Path, Point } from "./types";

// docs/specs/07-pin-geometry-engine.md §Open-Path Pin Distribution
// Pins at 0, D, 2D, ... floor(L/D)*D. Endpoint is never forced.
export function distributeOpenPath(path: Path, spacing: number): Point[] {
  const length = pathLength(path);
  if (spacing <= 0) throw new Error("spacing must be positive");
  const count = Math.floor(length / spacing) + 1;
  return Array.from({ length: count }, (_, i) => pointAtDistance(path, i * spacing));
}

// §Closed-Path Pin Count Algorithm — choose the integer interval count N that makes
// actualSpacing = P/N closest to the requested spacing D.
export function closestIntervalCount(perimeter: number, requestedSpacing: number): number {
  const approx = perimeter / requestedSpacing;
  const lo = Math.max(1, Math.floor(approx));
  const hi = Math.max(1, Math.ceil(approx));
  if (lo === hi) return lo;
  const diffLo = Math.abs(perimeter / lo - requestedSpacing);
  const diffHi = Math.abs(perimeter / hi - requestedSpacing);
  return diffHi < diffLo ? hi : lo;
}

export interface ClosedDistribution {
  points: Point[];
  actualSpacing: number;
  n: number;
}

// §Closed-Path Pin Distribution — uniform spacing around the full perimeter, no
// duplicate start/end pin (the pin at distance 0 IS the pin at distance P).
export function distributeClosedPath(path: Path, requestedSpacing: number): ClosedDistribution {
  if (requestedSpacing <= 0) throw new Error("spacing must be positive");
  const perimeter = pathLength(path);
  const n = closestIntervalCount(perimeter, requestedSpacing);
  const actualSpacing = perimeter / n;
  const points = Array.from({ length: n }, (_, i) => pointAtDistance(path, i * actualSpacing));
  return { points, actualSpacing, n };
}

// Vertex-anchored distribution for straight-edged shapes (Line, Rectangle, Square, and
// the Polygon/Star family — docs/specs/07-pin-geometry-engine.md) — every segment
// boundary is a real corner of the shape, so every corner gets a pin, and each edge's
// interior pins independently use the closest-N approximation (same rule as the
// closed-path algorithm, scoped to one edge). Curved shapes and Freehand are excluded
// by the caller: a curve has no discrete vertices, and Freehand's points are arbitrary
// sampled cursor positions, not meaningful corners.
export function distributePathPerVertex(path: Path, requestedSpacing: number): ClosedDistribution {
  if (requestedSpacing <= 0) throw new Error("spacing must be positive");
  const points: Point[] = [];
  let representativeSpacing = requestedSpacing;
  path.segments.forEach((segment, i) => {
    const segLen = segment.length();
    points.push(segment.pointAtDistance(0)); // the vertex — shared with the previous segment's end, never duplicated
    const n = closestIntervalCount(segLen, requestedSpacing);
    const segActualSpacing = segLen / n;
    if (i === 0) representativeSpacing = segActualSpacing;
    for (let k = 1; k < n; k += 1) points.push(segment.pointAtDistance(k * segActualSpacing));
  });
  if (!path.closed && path.segments.length > 0) {
    const last = path.segments[path.segments.length - 1];
    points.push(last.pointAtDistance(last.length())); // open paths have no next segment to own the final vertex
  }
  return { points, actualSpacing: representativeSpacing, n: points.length };
}
