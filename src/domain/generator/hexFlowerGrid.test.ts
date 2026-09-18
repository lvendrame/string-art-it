import { describe, expect, it } from "vitest";
import { hexFlowerGrid } from "./hexFlowerGrid";

describe("hexFlowerGrid", () => {
  it("throws for levels below 1 or non-positive radius", () => {
    expect(() => hexFlowerGrid(0, 10, 0, { x: 0, y: 0 })).toThrow();
    expect(() => hexFlowerGrid(3, 0, 0, { x: 0, y: 0 })).toThrow();
  });

  it("produces exactly 6*levels^2 cells", () => {
    for (const levels of [1, 2, 3, 5]) {
      expect(hexFlowerGrid(levels, 10, 0, { x: 0, y: 0 })).toHaveLength(6 * levels * levels);
    }
  });

  it("every cell's centre stays within the requested radius of the given centre", () => {
    const center = { x: 5, y: -3 };
    const radius = 20;
    const cells = hexFlowerGrid(4, radius, 0, center);
    for (const cell of cells) {
      const d = Math.hypot(cell.center.x - center.x, cell.center.y - center.y);
      expect(d).toBeLessThanOrEqual(radius);
    }
  });

  it("levels=1 produces 6 cells, one per wedge, all 'up' orientation (no down cells at row 0)", () => {
    const cells = hexFlowerGrid(1, 10, 0, { x: 0, y: 0 });
    expect(cells).toHaveLength(6);
    const rotations = cells.map((c) => c.rotation);
    // 6 distinct wedge angles, none flipped by PI (row 0 has no "down" triangle)
    expect(new Set(rotations.map((r) => Math.round(r * 1000))).size).toBe(6);
  });
});
