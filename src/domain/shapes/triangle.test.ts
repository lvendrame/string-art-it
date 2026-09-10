import { describe, expect, it } from "vitest";
import { pathLength } from "../paths";
import { equilateralTriangleShape, rightTriangleShape, rightTriangleHypotenuse } from "./triangle";

describe("equilateralTriangleShape", () => {
  it("all three sides equal the requested side length", () => {
    const path = equilateralTriangleShape({ x: 0, y: 0 }, 50);
    expect(pathLength(path)).toBeCloseTo(150, 6);
    for (const segment of path.segments) {
      expect(segment.length()).toBeCloseTo(50, 6);
    }
  });
});

describe("rightTriangleShape", () => {
  it("computes the hypotenuse automatically", () => {
    expect(rightTriangleHypotenuse(40, 30)).toBeCloseTo(50, 6);
  });

  it("perimeter equals base + height + hypotenuse", () => {
    const path = rightTriangleShape({ x: 0, y: 0 }, 40, 30);
    expect(pathLength(path)).toBeCloseTo(40 + 30 + 50, 6);
  });
});
