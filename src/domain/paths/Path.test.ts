import { describe, expect, it } from "vitest";
import { LineSegment } from "./LineSegment";
import { pathLength, pointAtDistance } from "./Path";
import { distributeOpenPath } from "./distribution";
import type { Path } from "./types";

describe("pathLength", () => {
  it("sums segment lengths", () => {
    const path: Path = {
      closed: false,
      segments: [
        new LineSegment({ x: 0, y: 0 }, { x: 10, y: 0 }),
        new LineSegment({ x: 10, y: 0 }, { x: 10, y: 10 }),
      ],
    };
    expect(pathLength(path)).toBe(20);
  });
});

describe("pointAtDistance across segment boundaries", () => {
  it("walks continuously into the next segment", () => {
    const path: Path = {
      closed: false,
      segments: [
        new LineSegment({ x: 0, y: 0 }, { x: 10, y: 0 }),
        new LineSegment({ x: 10, y: 0 }, { x: 10, y: 10 }),
      ],
    };
    expect(pointAtDistance(path, 5)).toEqual({ x: 5, y: 0 });
    expect(pointAtDistance(path, 12)).toEqual({ x: 10, y: 2 });
  });

  it("spacing carries continuously across a rectangle corner (docs/specs §20)", () => {
    // Two 10cm edges sharing a corner. Spacing 3cm: last pin on edge 1 falls 1cm before
    // the corner (at 9cm); the next pin must land 2cm into edge 2, not reset to 0.
    const path: Path = {
      closed: false,
      segments: [
        new LineSegment({ x: 0, y: 0 }, { x: 10, y: 0 }),
        new LineSegment({ x: 10, y: 0 }, { x: 10, y: 10 }),
      ],
    };
    const points = distributeOpenPath(path, 3);
    // 0,3,6,9,12,15,18 -> 7 pins; the one at 12 is 2cm into edge 2.
    expect(points).toHaveLength(7);
    expect(points[4]).toEqual({ x: 10, y: 2 });
  });
});
