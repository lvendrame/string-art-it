import type { Path, Point } from "./types";

export function pathLength(path: Path): number {
  return path.segments.reduce((sum, segment) => sum + segment.length(), 0);
}

// Walks the path's segments as one continuous distance axis — this is what makes pin
// spacing continue across corners instead of resetting per edge (docs/specs/07-pin-
// geometry-engine.md §Continuous Pin Spacing Through Corners).
export function pointAtDistance(path: Path, distance: number): Point {
  let remaining = distance;
  for (const segment of path.segments) {
    const len = segment.length();
    if (remaining <= len || segment === path.segments[path.segments.length - 1]) {
      return segment.pointAtDistance(Math.max(0, Math.min(remaining, len)));
    }
    remaining -= len;
  }
  // Empty path (no segments) — degenerate, but never throw on it.
  return { x: 0, y: 0 };
}

const BOUNDING_BOX_SAMPLES_PER_SEGMENT = 32;

// docs/specs/07-pin-geometry-engine.md / 01-architecture.md list bounding boxes as a
// Geometry Engine responsibility. Sampling only each segment's start point (as callers
// were doing ad hoc) collapses a circle/arc/ellipse to a single point — this samples
// each segment's actual extent instead. Not an exact analytic envelope, but accurate
// enough for viewport-fit and print-tiling purposes at this sample density.
export function pathBoundingBoxPoints(path: Path): Point[] {
  const points: Point[] = [];
  for (const segment of path.segments) {
    const len = segment.length();
    for (let i = 0; i <= BOUNDING_BOX_SAMPLES_PER_SEGMENT; i += 1) {
      points.push(segment.pointAtDistance((len * i) / BOUNDING_BOX_SAMPLES_PER_SEGMENT));
    }
  }
  return points.length > 0 ? points : [{ x: 0, y: 0 }];
}
