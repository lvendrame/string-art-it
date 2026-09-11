import { describe, expect, it } from "vitest";
import { LineSegment } from "./LineSegment";
import { CircularArcSegment } from "./CircularArcSegment";
import { distributeOpenPath, distributeClosedPath, distributePathPerVertex, closestIntervalCount } from "./distribution";
import type { Path } from "./types";

function openLine(length: number): Path {
  return { closed: false, segments: [new LineSegment({ x: 0, y: 0 }, { x: length, y: 0 })] };
}

// Regular hexagon with the given side length — 6 equal LineSegments, one per edge, built
// locally so this test stays at the paths layer (no dependency on domain/shapes).
function regularHexagon(side: number): Path {
  const radius = side; // for a regular hexagon, side length == circumradius
  const vertices = Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i;
    return { x: radius * Math.cos(angle), y: radius * Math.sin(angle) };
  });
  const segments = vertices.map((p, i) => new LineSegment(p, vertices[(i + 1) % vertices.length]));
  return { closed: true, segments };
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

describe("distributePathPerVertex", () => {
  it("closed hexagon: 1 pin per vertex + interior pins per edge, no duplicate seam pin", () => {
    const result = distributePathPerVertex(regularHexagon(2), 1);
    // each 2cm edge: closestIntervalCount(2, 1) = 2 -> 1 vertex + 1 interior pin per edge
    expect(result.n).toBe(12);
    expect(result.points).toHaveLength(12);
    expect(result.actualSpacing).toBeCloseTo(1, 6);
  });

  it("open Line: exact division matches today's endpoint-inclusive result (8cm / 1cm)", () => {
    const result = distributePathPerVertex(openLine(8), 1);
    expect(result.n).toBe(9);
    expect(result.points[0]).toEqual({ x: 0, y: 0 });
    expect(result.points.at(-1)).toEqual({ x: 8, y: 0 });
  });

  it("open Line: non-exact division now forces both endpoints (diverges from floor-division)", () => {
    const result = distributePathPerVertex(openLine(7.5), 1);
    expect(result.n).toBe(9);
    expect(result.actualSpacing).toBeCloseTo(0.9375, 4);
    expect(result.points[0]).toEqual({ x: 0, y: 0 });
    expect(result.points.at(-1)).toEqual({ x: 7.5, y: 0 });
  });

  it("an edge shorter than the requested spacing still yields its 2 vertex pins and 0 interior pins", () => {
    const result = distributePathPerVertex(openLine(0.5), 5);
    expect(result.n).toBe(2);
    expect(result.points).toEqual([{ x: 0, y: 0 }, { x: 0.5, y: 0 }]);
  });

  it("every edge of a symmetric closed shape yields the same actual spacing (representative-segment assumption holds)", () => {
    const result = distributePathPerVertex(regularHexagon(3.5), 2);
    // closestIntervalCount(3.5, 2) = 2 for every edge -> 1 vertex + 1 interior pin each = 12 total
    expect(result.n).toBe(12);
    const spacing = result.actualSpacing;
    for (let i = 0; i < result.points.length; i += 1) {
      const next = result.points[(i + 1) % result.points.length];
      const dist = Math.hypot(next.x - result.points[i].x, next.y - result.points[i].y);
      expect(dist).toBeCloseTo(spacing, 4);
    }
  });
});
