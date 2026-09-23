import { describe, expect, it } from "vitest";
import { EllipticalArcSegment } from "./EllipticalArcSegment";

describe("EllipticalArcSegment", () => {
  it("approximates the circumference of a circle (radiusX === radiusY)", () => {
    const seg = new EllipticalArcSegment({ x: 0, y: 0 }, 10, 10, 0, 0, 2 * Math.PI);
    expect(seg.length()).toBeCloseTo(2 * Math.PI * 10, 1);
  });

  it("returns the start point for distance <= 0", () => {
    const seg = new EllipticalArcSegment({ x: 5, y: 5 }, 10, 4, 0, 0, Math.PI);
    expect(seg.pointAtDistance(0)).toEqual({ x: 15, y: 5 });
    expect(seg.pointAtDistance(-5)).toEqual({ x: 15, y: 5 });
  });

  it("returns the end point for distance >= total length", () => {
    const seg = new EllipticalArcSegment({ x: 0, y: 0 }, 10, 4, 0, 0, Math.PI);
    const total = seg.length();
    const end = seg.pointAtDistance(total);
    expect(end.x).toBeCloseTo(-10, 5);
    expect(end.y).toBeCloseTo(0, 5);
    expect(seg.pointAtDistance(total + 100)).toEqual(end);
  });

  it("interpolates a mid-arc point via binary search over the sample table", () => {
    const seg = new EllipticalArcSegment({ x: 0, y: 0 }, 10, 10, 0, 0, Math.PI / 2);
    const total = seg.length();
    const mid = seg.pointAtDistance(total / 2);
    // Quarter-circle radius 10: the halfway point along the arc lands at 45 degrees.
    expect(mid.x).toBeCloseTo(10 * Math.cos(Math.PI / 4), 1);
    expect(mid.y).toBeCloseTo(10 * Math.sin(Math.PI / 4), 1);
  });

  it("applies rotation to every sampled point", () => {
    const unrotated = new EllipticalArcSegment({ x: 0, y: 0 }, 10, 4, 0, 0, Math.PI);
    const rotated = new EllipticalArcSegment({ x: 0, y: 0 }, 10, 4, Math.PI / 2, 0, Math.PI);
    const p = unrotated.pointAtDistance(unrotated.length() / 2);
    const r = rotated.pointAtDistance(rotated.length() / 2);
    // A 90 degree rotation maps (x, y) -> (-y, x).
    expect(r.x).toBeCloseTo(-p.y, 1);
    expect(r.y).toBeCloseTo(p.x, 1);
  });

  it("handles a negative (clockwise) sweep", () => {
    const seg = new EllipticalArcSegment({ x: 0, y: 0 }, 10, 10, 0, 0, -Math.PI / 2);
    const total = seg.length();
    expect(total).toBeCloseTo((Math.PI / 2) * 10, 1);
    const end = seg.pointAtDistance(total);
    expect(end.x).toBeCloseTo(0, 1);
    expect(end.y).toBeCloseTo(-10, 1);
  });
});
