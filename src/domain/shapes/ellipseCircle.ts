import { CircularArcSegment, EllipticalArcSegment } from "../paths";
import type { Path, Point } from "../paths";

export function circleShape(center: Point, radius: number): Path {
  return { closed: true, segments: [new CircularArcSegment(center, radius, 0, 2 * Math.PI)] };
}

export function ellipseShape(center: Point, radiusX: number, radiusY: number, rotation = 0): Path {
  // A circle is just an ellipse with equal radii — the Alt constraint modifier
  // (docs/specs/13-shape-constraint-modifier) uses this directly.
  if (radiusX === radiusY) return circleShape(center, radiusX);
  return {
    closed: true,
    segments: [new EllipticalArcSegment(center, radiusX, radiusY, rotation, 0, 2 * Math.PI)],
  };
}
