import type { Point } from "../paths";

export function rotatePoint(point: Point, pivot: Point, radians: number): Point {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const dx = point.x - pivot.x;
  const dy = point.y - pivot.y;
  return {
    x: pivot.x + dx * cos - dy * sin,
    y: pivot.y + dx * sin + dy * cos,
  };
}

export function translatePoint(point: Point, delta: Point): Point {
  return { x: point.x + delta.x, y: point.y + delta.y };
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function boundingBoxOf(points: Point[]): BoundingBox {
  if (points.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  return points.reduce(
    (box, p) => ({
      minX: Math.min(box.minX, p.x),
      minY: Math.min(box.minY, p.y),
      maxX: Math.max(box.maxX, p.x),
      maxY: Math.max(box.maxY, p.y),
    }),
    { minX: points[0].x, minY: points[0].y, maxX: points[0].x, maxY: points[0].y },
  );
}
