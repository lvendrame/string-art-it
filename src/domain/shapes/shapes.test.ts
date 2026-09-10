import { describe, expect, it } from "vitest";
import { pathLength } from "../paths";
import { arcShape } from "./arc";
import { circleShape, ellipseShape } from "./ellipseCircle";
import { rectangleShape, squareShape } from "./rectangleSquare";
import { regularPolygonShape, starShape, polygramShape, PENTAGRAM, OCTAGRAM } from "./polygonFamily";

describe("circleShape", () => {
  it("has the true circumference, not a polygon approximation", () => {
    const path = circleShape({ x: 0, y: 0 }, 5);
    expect(pathLength(path)).toBeCloseTo(2 * Math.PI * 5, 6);
  });
});

describe("ellipseShape", () => {
  it("numerically approximates perimeter within tight tolerance of a reference value", () => {
    // Ramanujan's second approximation for an ellipse with a=5, b=3 (reference truth).
    const a = 5;
    const b = 3;
    const h = ((a - b) ** 2) / ((a + b) ** 2);
    const reference = Math.PI * (a + b) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));

    const path = ellipseShape({ x: 0, y: 0 }, a, b);
    expect(pathLength(path)).toBeCloseTo(reference, 2);
  });

  it("degenerates to a circle when radii are equal", () => {
    const path = ellipseShape({ x: 0, y: 0 }, 4, 4);
    expect(pathLength(path)).toBeCloseTo(2 * Math.PI * 4, 6);
  });
});

describe("arcShape", () => {
  it("a semicircle sagitta reconstructs the exact centre and radius", () => {
    const r = 5;
    const path = arcShape({ x: -r, y: 0 }, { x: r, y: 0 }, r);
    expect(pathLength(path)).toBeCloseTo(Math.PI * r, 6);
  });

  it("a quarter-circle sagitta reconstructs true arc length", () => {
    const r = 10;
    const halfAngle = Math.PI / 4;
    const sagitta = r * (1 - Math.cos(halfAngle));
    const path = arcShape({ x: r, y: 0 }, { x: 0, y: r }, sagitta);
    expect(pathLength(path)).toBeCloseTo(r * (Math.PI / 2), 4);
  });

  it("curvature 0 degenerates to a straight line", () => {
    const path = arcShape({ x: 0, y: 0 }, { x: 10, y: 0 }, 0);
    expect(pathLength(path)).toBeCloseTo(10, 6);
  });
});

describe("rectangleShape / squareShape", () => {
  it("has a continuous perimeter equal to 2*(w+h)", () => {
    const path = rectangleShape({ x: 0, y: 0 }, 10, 6);
    expect(pathLength(path)).toBeCloseTo(32, 6);
  });

  it("square is a rectangle with equal sides", () => {
    const path = squareShape({ x: 0, y: 0 }, 5);
    expect(pathLength(path)).toBeCloseTo(20, 6);
  });
});

describe("regularPolygonShape", () => {
  it("octagon perimeter equals 8 * side length", () => {
    const radius = 10;
    const path = regularPolygonShape({ x: 0, y: 0 }, radius, 8);
    const side = 2 * radius * Math.sin(Math.PI / 8);
    expect(pathLength(path)).toBeCloseTo(8 * side, 6);
  });
});

describe("starShape", () => {
  it("5-point star has 10 continuous edges", () => {
    const path = starShape({ x: 0, y: 0 }, 10, 4, 5);
    expect(path.segments).toHaveLength(10);
    expect(pathLength(path)).toBeGreaterThan(0);
  });
});

describe("polygramShape", () => {
  it("pentagram perimeter follows the self-intersecting traversal, not the convex hull", () => {
    const radius = 10;
    const pentagram = polygramShape({ x: 0, y: 0 }, radius, PENTAGRAM.points, PENTAGRAM.skip);
    const hull = regularPolygonShape({ x: 0, y: 0 }, radius, 5);

    expect(pathLength(pentagram)).not.toBeCloseTo(pathLength(hull), 1);
    expect(pathLength(pentagram)).toBeGreaterThan(pathLength(hull));
  });

  it("octagram {8/3} is a single continuous path of 8 edges", () => {
    const path = polygramShape({ x: 0, y: 0 }, 10, OCTAGRAM.points, OCTAGRAM.skip);
    expect(path.segments).toHaveLength(8);
  });

  it("rejects a points/skip pair that is not a single continuous path", () => {
    expect(() => polygramShape({ x: 0, y: 0 }, 10, 8, 2)).toThrow();
  });
});
