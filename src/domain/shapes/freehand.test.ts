import { describe, expect, it } from "vitest";
import { pathLength } from "../paths";
import { freehandShape } from "./freehand";

describe("freehandShape", () => {
  it("chains consecutive points into one open Path", () => {
    const path = freehandShape([{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: 3, y: 4 }]);
    expect(path.closed).toBe(false);
    expect(path.segments).toHaveLength(2);
    expect(pathLength(path)).toBeCloseTo(3 + 4, 6);
  });

  it("a single point produces a zero-length, zero-segment path", () => {
    const path = freehandShape([{ x: 5, y: 5 }]);
    expect(path.segments).toHaveLength(0);
    expect(pathLength(path)).toBe(0);
  });
});
