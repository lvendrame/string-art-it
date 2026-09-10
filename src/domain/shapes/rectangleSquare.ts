import { LineSegment } from "../paths";
import { rotatePoint } from "../transforms";
import type { Path, Point } from "../paths";

// position is the top-left corner before rotation; rotation is applied about the
// rectangle's own centre, in radians.
export function rectangleShape(position: Point, width: number, height: number, rotation = 0): Path {
  const center: Point = { x: position.x + width / 2, y: position.y + height / 2 };
  const corners: Point[] = [
    { x: position.x, y: position.y },
    { x: position.x + width, y: position.y },
    { x: position.x + width, y: position.y + height },
    { x: position.x, y: position.y + height },
  ].map((p) => rotatePoint(p, center, rotation));

  const segments = corners.map((p, i) => new LineSegment(p, corners[(i + 1) % corners.length]));
  return { closed: true, segments };
}

export function squareShape(position: Point, side: number, rotation = 0): Path {
  return rectangleShape(position, side, side, rotation);
}
