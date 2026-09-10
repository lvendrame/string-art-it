import { describe, expect, it } from "vitest";
import { mirrorCopies } from "./mirror";
import { generateRadialCopies, rotateAround } from "./radial";

describe("mirrorCopies", () => {
  const axis = { x: 0, y: 0 };
  const points = [{ x: 3, y: 4 }];

  it("vertical produces exactly one reflected copy", () => {
    const copies = mirrorCopies(points, "vertical", axis);
    expect(copies).toHaveLength(1);
    expect(copies[0]).toEqual([{ x: -3, y: 4 }]);
  });

  it("horizontal produces exactly one reflected copy", () => {
    const copies = mirrorCopies(points, "horizontal", axis);
    expect(copies).toHaveLength(1);
    expect(copies[0]).toEqual([{ x: 3, y: -4 }]);
  });

  it("both produces three copies (one per remaining quadrant)", () => {
    const copies = mirrorCopies(points, "both", axis);
    expect(copies).toHaveLength(3);
    expect(copies).toContainEqual([{ x: -3, y: 4 }]);
    expect(copies).toContainEqual([{ x: 3, y: -4 }]);
    expect(copies).toContainEqual([{ x: -3, y: -4 }]);
  });

  it("none produces no copies", () => {
    expect(mirrorCopies(points, "none", axis)).toHaveLength(0);
  });
});

describe("generateRadialCopies", () => {
  it("45deg interval produces 7 copies (8 total instances)", () => {
    const copies = generateRadialCopies([{ x: 10, y: 0 }], { x: 0, y: 0 }, 45);
    expect(copies).toHaveLength(7);
  });

  it("custom interval never duplicates the source angle", () => {
    const copies = generateRadialCopies([{ x: 10, y: 0 }], { x: 0, y: 0 }, 37);
    expect(copies.length).toBe(Math.ceil(360 / 37) - 1);
    for (const copy of copies) {
      expect(copy[0].x === 10 && Math.abs(copy[0].y) < 1e-9).toBe(false);
    }
  });

  it("rotateAround rotates a point 90 degrees about an arbitrary centre", () => {
    const rotated = rotateAround({ x: 1, y: 0 }, { x: 0, y: 0 }, Math.PI / 2);
    expect(rotated.x).toBeCloseTo(0, 6);
    expect(rotated.y).toBeCloseTo(1, 6);
  });
});
