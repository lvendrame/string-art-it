import { LineSegment } from "../paths";
import type { Path, Point } from "../paths";

export function lineShape(start: Point, end: Point): Path {
  return { closed: false, segments: [new LineSegment(start, end)] };
}
