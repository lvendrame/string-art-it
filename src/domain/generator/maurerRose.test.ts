import { describe, expect, it } from "vitest";
import { maurerRosePoints } from "./maurerRose";

describe("maurerRosePoints", () => {
  it("throws for non-positive N or maxSteps", () => {
    expect(() => maurerRosePoints(0, 10, 71, 0, 50, { x: 0, y: 0 })).toThrow();
    expect(() => maurerRosePoints(5, 0, 71, 0, 50, { x: 0, y: 0 })).toThrow();
  });

  it("returns maxSteps+1 points", () => {
    const points = maurerRosePoints(5, 100, 71, 0, 50, { x: 0, y: 0 });
    expect(points).toHaveLength(101);
  });

  it("first point is at theta=0, which is the centre (sin(0)=0)", () => {
    const center = { x: 3, y: -2 };
    const points = maurerRosePoints(5, 100, 71, 0, 50, center);
    expect(points[0].x).toBeCloseTo(center.x, 9);
    expect(points[0].y).toBeCloseTo(center.y, 9);
  });

  it("every point stays within maxRadius of the centre", () => {
    const maxRadius = 40;
    const points = maurerRosePoints(7, 150, 71, 0, maxRadius, { x: 0, y: 0 });
    for (const p of points) {
      expect(Math.hypot(p.x, p.y)).toBeLessThanOrEqual(maxRadius + 1e-9);
    }
  });
});
