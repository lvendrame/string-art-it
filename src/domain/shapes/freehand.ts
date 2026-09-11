import { LineSegment } from "../paths";
import type { Path, Point } from "../paths";

// A hand-drawn shape is just many short line segments chained end-to-end — the Path
// engine (length/pointAtDistance) already treats any Segment sequence uniformly, so
// pin distribution needs no freehand-specific logic.
export function freehandShape(points: Point[]): Path {
  const segments: LineSegment[] = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    segments.push(new LineSegment(points[i], points[i + 1]));
  }
  return { closed: false, segments };
}
