import type { Point, Segment } from "./types";

// True circular arc — length is exact (radius * angle), not a polygon approximation,
// per docs/specs/07-pin-geometry-engine.md §Geometry Precision. A full circle is just
// an arc with sweep = 2π.
export class CircularArcSegment implements Segment {
  private readonly len: number;

  constructor(
    public readonly center: Point,
    public readonly radius: number,
    public readonly startAngle: number,
    // Signed sweep in radians: positive = counter-clockwise, negative = clockwise.
    public readonly sweep: number,
  ) {
    this.len = Math.abs(radius * sweep);
  }

  length(): number {
    return this.len;
  }

  pointAtDistance(distance: number): Point {
    const t = this.len === 0 ? 0 : distance / this.len;
    const angle = this.startAngle + this.sweep * t;
    return {
      x: this.center.x + this.radius * Math.cos(angle),
      y: this.center.y + this.radius * Math.sin(angle),
    };
  }
}
