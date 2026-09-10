import { describe, expect, it } from "vitest";
import { boundingBoxOf } from "../transforms";
import { circleShape } from "../shapes";
import { pathBoundingBoxPoints } from "./Path";

describe("pathBoundingBoxPoints", () => {
  it("a circle's bounding box covers its full diameter, not just the start point", () => {
    // Regression: sampling only segment start points collapsed a circle to one point.
    const path = circleShape({ x: 0, y: 0 }, 10);
    const box = boundingBoxOf(pathBoundingBoxPoints(path));

    expect(box.minX).toBeCloseTo(-10, 1);
    expect(box.maxX).toBeCloseTo(10, 1);
    expect(box.minY).toBeCloseTo(-10, 1);
    expect(box.maxY).toBeCloseTo(10, 1);
  });

  it("an off-centre circle's bounding box is centred correctly", () => {
    const path = circleShape({ x: 50, y: 20 }, 5);
    const box = boundingBoxOf(pathBoundingBoxPoints(path));

    expect(box.minX).toBeCloseTo(45, 1);
    expect(box.maxX).toBeCloseTo(55, 1);
    expect(box.minY).toBeCloseTo(15, 1);
    expect(box.maxY).toBeCloseTo(25, 1);
  });
});
