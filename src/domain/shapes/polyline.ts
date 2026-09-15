import { LineSegment } from "../paths";
import type { Path, Point } from "../paths";

// A closed contour (e.g. one loop of a flattened glyph outline — the outer ring of an
// "o", or the dot of an "i") is just many short line segments chained end-to-end, with
// the last point closing back to the first. Same "the Path engine treats any Segment
// sequence uniformly" reasoning as freehandShape.ts, just closed instead of open.
export function closedPolylineShape(points: Point[]): Path {
  if (points.length < 2) return { closed: true, segments: [] };
  const segments: LineSegment[] = [];
  for (let i = 0; i < points.length; i += 1) {
    const start = points[i];
    const end = points[(i + 1) % points.length];
    segments.push(new LineSegment(start, end));
  }
  return { closed: true, segments };
}
