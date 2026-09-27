import { LineSegment } from "@domain/paths";
import type { Path, Point } from "@domain/paths";

// A hand-drawn shape is just many short line segments chained end-to-end — the Path
// engine (length/pointAtDistance) already treats any Segment sequence uniformly, so
// pin distribution needs no freehand-specific logic.
// A lone point (a click without drag) becomes one zero-length segment so the single
// pin lands on that point instead of the empty-path fallback origin.
export function freehandShape(points: Point[]): Path {
  if (points.length === 1) return { closed: false, segments: [new LineSegment(points[0], points[0])] };
  const segments: LineSegment[] = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    segments.push(new LineSegment(points[i], points[i + 1]));
  }
  return { closed: false, segments };
}
