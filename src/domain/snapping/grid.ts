import type { Point } from "../paths";

export interface GridGap {
  x: number;
  y: number;
}

export function snapToGrid(point: Point, gap: GridGap): Point {
  return {
    x: Math.round(point.x / gap.x) * gap.x,
    y: Math.round(point.y / gap.y) * gap.y,
  };
}
