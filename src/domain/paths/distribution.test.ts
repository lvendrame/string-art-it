import { describe, expect, it } from "vitest";
import { LineSegment } from "./LineSegment";
import { CircularArcSegment } from "./CircularArcSegment";
import { distributeOpenPath, distributeClosedPath, closestIntervalCount } from "./distribution";
import type { Path } from "./types";

function openLine(length: number): Path {
  return { closed: false, segments: [new LineSegment({ x: 0, y: 0 }, { x: length, y: 0 })] };
}

// Perimeter-P closed path built from a circle whose circumference is exactly P — lets
// tests target an exact perimeter without depending on shape-specific code.
function closedLoopOfPerimeter(perimeter: number): Path {
  const radius = perimeter / (2 * Math.PI);
  return { closed: true, segments: [new CircularArcSegment({ x: 0, y: 0 }, radius, 0, 2 * Math.PI)] };
}

describe("distributeOpenPath", () => {
  it("8cm / 1cm -> 9 pins at 0..8", () => {
    const points = distributeOpenPath(openLine(8), 1);
    expect(points).toHaveLength(9);
    expect(points.map((p) => p.x)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("7.5cm / 1cm -> 8 pins, last 0.5cm left empty", () => {
    const points = distributeOpenPath(openLine(7.5), 1);
    expect(points).toHaveLength(8);
    expect(points[points.length - 1].x).toBe(7);
  });

  it("spacing larger than path still places the start pin", () => {
    const points = distributeOpenPath(openLine(0.5), 5);
    expect(points).toHaveLength(1);
    expect(points[0]).toEqual({ x: 0, y: 0 });
  });

  it("very small path with very small spacing avoids float rounding artifacts", () => {
    const points = distributeOpenPath(openLine(0.01), 0.001);
    expect(points).toHaveLength(11);
  });
});

describe("closestIntervalCount", () => {
  it("31cm perimeter / 2cm requested -> 16 intervals (1.9375cm actual)", () => {
    expect(closestIntervalCount(31, 2)).toBe(16);
    expect(31 / 16).toBeCloseTo(1.9375, 4);
  });

  it("exact closed division has no rounding artifact", () => {
    expect(closestIntervalCount(30, 3)).toBe(10);
  });

  it("picks the closer of two candidates deterministically (100cm / 7cm)", () => {
    // 14 -> 7.143 (diff 0.143), 15 -> 6.667 (diff 0.333) => 14 wins
    expect(closestIntervalCount(100, 7)).toBe(14);
  });

  it("spacing larger than perimeter collapses to a single interval", () => {
    expect(closestIntervalCount(5, 20)).toBe(1);
  });
});

describe("distributeClosedPath", () => {
  it("31cm perimeter / 2cm requested -> 16 pins, actual 1.9375cm, no duplicate seam pin", () => {
    const result = distributeClosedPath(closedLoopOfPerimeter(31), 2);
    expect(result.n).toBe(16);
    expect(result.actualSpacing).toBeCloseTo(1.9375, 4);
    expect(result.points).toHaveLength(16);
  });

  it("exact division yields exact actual spacing", () => {
    const result = distributeClosedPath(closedLoopOfPerimeter(30), 3);
    expect(result.n).toBe(10);
    expect(result.actualSpacing).toBeCloseTo(3, 6);
  });

  it("spacing larger than perimeter yields a single pin", () => {
    const result = distributeClosedPath(closedLoopOfPerimeter(5), 20);
    expect(result.n).toBe(1);
  });
});
