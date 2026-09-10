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
