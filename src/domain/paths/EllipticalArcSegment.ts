import type { Point, Segment } from "./types";

// Ellipse arc length has no closed form (docs/specs/07-pin-geometry-engine.md
// §Geometry Precision requires "accurate numerical path length" within a defined
// tolerance). Approach: densely sample the parametric ellipse, build a cumulative
// chord-length table, and interpolate — accurate to well under 0.1% at this sample
// count for any non-degenerate ellipse.
const SAMPLES = 1440;

export class EllipticalArcSegment implements Segment {
  private readonly cumulativeLength: number[] = [];
  private readonly angles: number[] = [];

  constructor(
    public readonly center: Point,
    public readonly radiusX: number,
    public readonly radiusY: number,
    public readonly rotation: number,
    public readonly startAngle: number,
    public readonly sweep: number,
  ) {
    let acc = 0;
    let prev = this.pointAtAngle(startAngle);
    this.cumulativeLength.push(0);
    this.angles.push(startAngle);
    for (let i = 1; i <= SAMPLES; i += 1) {
      const angle = startAngle + (sweep * i) / SAMPLES;
      const point = this.pointAtAngle(angle);
      acc += Math.hypot(point.x - prev.x, point.y - prev.y);
      this.cumulativeLength.push(acc);
      this.angles.push(angle);
      prev = point;
    }
  }

  private pointAtAngle(angle: number): Point {
    const ex = this.radiusX * Math.cos(angle);
    const ey = this.radiusY * Math.sin(angle);
    const cos = Math.cos(this.rotation);
    const sin = Math.sin(this.rotation);
    return {
      x: this.center.x + ex * cos - ey * sin,
      y: this.center.y + ex * sin + ey * cos,
    };
  }

  length(): number {
    return this.cumulativeLength[this.cumulativeLength.length - 1];
  }

  pointAtDistance(distance: number): Point {
    const table = this.cumulativeLength;
    if (distance <= 0) return this.pointAtAngle(this.angles[0]);
    const total = table[table.length - 1];
    if (distance >= total) return this.pointAtAngle(this.angles[this.angles.length - 1]);

    // Binary search for the bracketing sample pair, then interpolate the angle.
    let lo = 0;
    let hi = table.length - 1;
    while (lo < hi - 1) {
      const mid = Math.floor((lo + hi) / 2);
      if (table[mid] <= distance) lo = mid;
      else hi = mid;
    }
    const segLen = table[hi] - table[lo];
    const t = segLen === 0 ? 0 : (distance - table[lo]) / segLen;
    const angle = this.angles[lo] + (this.angles[hi] - this.angles[lo]) * t;
    return this.pointAtAngle(angle);
  }
}
