import { LineSegment } from "@domain/paths";
import type { Path, Point } from "@domain/paths";

export function lineShape(start: Point, end: Point): Path {
  return { closed: false, segments: [new LineSegment(start, end)] };
}
