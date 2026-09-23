import { describe, expect, it } from "vitest";
import { pathLength } from "@domain/paths";
import { closedPolylineShape } from "./polyline";

describe("closedPolylineShape", () => {
  it("chains points into a closed Path, including the wrap-around edge", () => {
    const path = closedPolylineShape([{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: 3, y: 4 }]);
    expect(path.closed).toBe(true);
    expect(path.segments).toHaveLength(3);
    expect(pathLength(path)).toBeCloseTo(3 + 4 + 5, 6); // 3-4-5 right triangle perimeter
  });

  it("fewer than 2 points produces a zero-segment path", () => {
    expect(closedPolylineShape([]).segments).toHaveLength(0);
    expect(closedPolylineShape([{ x: 1, y: 1 }]).segments).toHaveLength(0);
  });
});
