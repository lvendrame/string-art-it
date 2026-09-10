import type { Point, Segment } from "./types";

export class LineSegment implements Segment {
  private readonly len: number;

  constructor(
    public readonly start: Point,
    public readonly end: Point,
  ) {
    this.len = Math.hypot(end.x - start.x, end.y - start.y);
  }

  length(): number {
    return this.len;
  }

  pointAtDistance(distance: number): Point {
    if (this.len === 0) return { ...this.start };
    const t = distance / this.len;
    return {
      x: this.start.x + (this.end.x - this.start.x) * t,
      y: this.start.y + (this.end.y - this.start.y) * t,
    };
  }
}
