import { describe, expect, it } from "vitest";
import { spiralArmPoints } from "./spiralArms";

describe("spiralArmPoints", () => {
  it("produces (nailsPerSpiral - 1) * arms points in (i outer, s inner) order", () => {
    const points = spiralArmPoints({ arms: 2, nailsPerSpiral: 3, totalAngleTurns: 0, rotation: 0, maxRadius: 10, center: { x: 0, y: 0 } });
    expect(points).toHaveLength(4);
  });

  it("with zero twist, each arm's points sit on its own straight radial ray", () => {
    const points = spiralArmPoints({ arms: 2, nailsPerSpiral: 3, totalAngleTurns: 0, rotation: 0, maxRadius: 10, center: { x: 0, y: 0 } });
    // i=1 (p=0.5): arm 0 at radius 5 angle 0, arm 1 at radius 5 angle pi
    expect(points[0].x).toBeCloseTo(5, 6);
    expect(points[0].y).toBeCloseTo(0, 6);
    expect(points[1].x).toBeCloseTo(-5, 6);
    expect(points[1].y).toBeCloseTo(0, 6);
    // i=2 (p=1): radius 10
    expect(points[2].x).toBeCloseTo(10, 6);
    expect(points[3].x).toBeCloseTo(-10, 6);
  });

  it("offsets from a non-origin center", () => {
    const points = spiralArmPoints({ arms: 1, nailsPerSpiral: 2, totalAngleTurns: 0, rotation: 0, maxRadius: 4, center: { x: 3, y: 2 } });
    expect(points).toHaveLength(1);
    expect(points[0].x).toBeCloseTo(7, 6);
    expect(points[0].y).toBeCloseTo(2, 6);
  });

  it("rejects invalid arms/nailsPerSpiral", () => {
    expect(() => spiralArmPoints({ arms: 0, nailsPerSpiral: 5, totalAngleTurns: 0, rotation: 0, maxRadius: 1, center: { x: 0, y: 0 } })).toThrow();
    expect(() => spiralArmPoints({ arms: 2, nailsPerSpiral: 1, totalAngleTurns: 0, rotation: 0, maxRadius: 1, center: { x: 0, y: 0 } })).toThrow();
  });
});
