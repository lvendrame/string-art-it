import { describe, expect, it } from "vitest";
import { CircularArcSegment } from "./CircularArcSegment";

describe("CircularArcSegment", () => {
  it("computes length as radius * |sweep|", () => {
    const seg = new CircularArcSegment({ x: 0, y: 0 }, 10, 0, Math.PI);
    expect(seg.length()).toBeCloseTo(10 * Math.PI, 5);
  });

  it("pointAtDistance interpolates along the sweep", () => {
    const seg = new CircularArcSegment({ x: 0, y: 0 }, 10, 0, Math.PI / 2);
    const start = seg.pointAtDistance(0);
    expect(start.x).toBeCloseTo(10, 5);
    expect(start.y).toBeCloseTo(0, 5);

    const end = seg.pointAtDistance(seg.length());
    expect(end.x).toBeCloseTo(0, 5);
    expect(end.y).toBeCloseTo(10, 5);
  });

  it("pointAtDistance on a zero-length arc (zero sweep) returns the start point", () => {
    const seg = new CircularArcSegment({ x: 5, y: 5 }, 10, 0, 0);
    expect(seg.length()).toBe(0);
    const p = seg.pointAtDistance(0);
    expect(p.x).toBeCloseTo(15, 5);
    expect(p.y).toBeCloseTo(5, 5);
  });
});
