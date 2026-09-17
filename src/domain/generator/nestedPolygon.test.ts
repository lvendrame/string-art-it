import { describe, expect, it } from "vitest";
import { connectTwoSidesLocalIndices, nestedPolygonLevels, nestedPolygonVertices } from "./nestedPolygon";

describe("nestedPolygonLevels", () => {
  it("level 0 is the base radius/rotation unchanged", () => {
    const [level0] = nestedPolygonLevels(6, 10, 0.5, 0.063, 3, 1);
    expect(level0.radius).toBeCloseTo(10, 6);
    expect(level0.rotation).toBeCloseTo(0.5, 6);
  });

  it("radius shrinks and rotation twists monotonically with depth (direction +1)", () => {
    const levels = nestedPolygonLevels(6, 10, 0, 0.063, 5, 1);
    for (let i = 1; i < levels.length; i += 1) {
      expect(levels[i].radius).toBeLessThan(levels[i - 1].radius);
      expect(levels[i].rotation).toBeGreaterThan(levels[i - 1].rotation);
    }
  });

  it("direction -1 twists the opposite way", () => {
    const levels = nestedPolygonLevels(3, 10, 0, 0.063, 3, -1);
    expect(levels[1].rotation).toBeLessThan(levels[0].rotation);
    expect(levels[2].rotation).toBeLessThan(levels[1].rotation);
  });

  it("rejects invalid sides/depth", () => {
    expect(() => nestedPolygonLevels(2, 10, 0, 0.063, 3, 1)).toThrow();
    expect(() => nestedPolygonLevels(6, 10, 0, 0.063, 0, 1)).toThrow();
  });
});

describe("nestedPolygonVertices", () => {
  it("depth 1, rotation 0: vertex 0 sits at the top of the circle", () => {
    const levels = nestedPolygonLevels(3, 10, 0, 0.063, 1, 1);
    const points = nestedPolygonVertices({ x: 0, y: 0 }, 3, levels);
    expect(points).toHaveLength(3);
    expect(points[0].x).toBeCloseTo(0, 6);
    expect(points[0].y).toBeCloseTo(-10, 6);
  });

  it("flattens level-major then side-minor: index q*sides+s", () => {
    const levels = nestedPolygonLevels(4, 10, 0, 0.063, 3, 1);
    const points = nestedPolygonVertices({ x: 0, y: 0 }, 4, levels);
    expect(points).toHaveLength(12);
    // level 1 (q=1) side 2 (s=2) is at flattened index 1*4+2 = 6
    const angle = levels[1].rotation + (2 * Math.PI * 2) / 4 - Math.PI / 2;
    const expected = { x: levels[1].radius * Math.cos(angle), y: levels[1].radius * Math.sin(angle) };
    expect(points[6].x).toBeCloseTo(expected.x, 6);
    expect(points[6].y).toBeCloseTo(expected.y, 6);
  });
});

describe("connectTwoSidesLocalIndices", () => {
  it("matches the documented worked example shape: s0,next0,next1,s1,s2,next2,next3,s3,...", () => {
    // sides=6, depth=4, s=0 -> next=1
    // q0 even: s(0,0)=0, next(0,1)=1
    // q1 odd:  next(1,1)=7, s(1,0)=6
    // q2 even: s(2,0)=12, next(2,1)=13
    // q3 odd:  next(3,1)=19, s(3,0)=18
    expect(connectTwoSidesLocalIndices(6, 4, 0)).toEqual([0, 1, 7, 6, 12, 13, 19, 18]);
  });

  it("always has exactly 2*depth local indices (2*depth-1 segments once threaded)", () => {
    for (const depth of [1, 2, 5, 10]) {
      expect(connectTwoSidesLocalIndices(3, depth, 1)).toHaveLength(2 * depth);
    }
  });

  it("wraps the last side back to side 0", () => {
    const indices = connectTwoSidesLocalIndices(3, 1, 2);
    // s=2, next=(2+1)%3=0
    expect(indices).toEqual([2, 0]);
  });
});
