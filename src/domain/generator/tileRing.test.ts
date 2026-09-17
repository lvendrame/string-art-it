import { describe, expect, it } from "vitest";
import { tileRingLayout } from "./tileRing";

describe("tileRingLayout", () => {
  it("returns tileCount tiles, all with the given sides", () => {
    const tiles = tileRingLayout(6, 3, 10, Math.PI / 6, 0, { x: 0, y: 0 }, false);
    expect(tiles).toHaveLength(6);
    for (const tile of tiles) expect(tile.sides).toBe(3);
  });

  it("places every tile centre exactly helperRadius from the ring centre", () => {
    const center = { x: 5, y: -3 };
    const helperRadius = 20;
    const tiles = tileRingLayout(6, 3, helperRadius, Math.PI / 6, 0, center, false);
    for (const tile of tiles) {
      const dx = tile.center.x - center.x;
      const dy = tile.center.y - center.y;
      expect(Math.hypot(dx, dy)).toBeCloseTo(helperRadius, 9);
    }
  });

  it("spaces tile baseRotation evenly by 2*PI/tileCount", () => {
    const tiles = tileRingLayout(6, 3, 10, Math.PI / 6, 0, { x: 0, y: 0 }, false);
    for (let t = 1; t < tiles.length; t += 1) {
      expect(tiles[t].baseRotation - tiles[t - 1].baseRotation).toBeCloseTo((2 * Math.PI) / 6, 9);
    }
  });

  it("direction follows mirrorTiling for every tile", () => {
    const mirrored = tileRingLayout(6, 3, 10, Math.PI / 6, 0, { x: 0, y: 0 }, true);
    const notMirrored = tileRingLayout(6, 3, 10, Math.PI / 6, 0, { x: 0, y: 0 }, false);
    for (const tile of mirrored) expect(tile.direction).toBe(1);
    for (const tile of notMirrored) expect(tile.direction).toBe(-1);
  });

  it("works for a non-hexagonal ring (e.g. tileCount=1)", () => {
    const tiles = tileRingLayout(1, 4, 10, 0, 0, { x: 0, y: 0 }, false);
    expect(tiles).toHaveLength(1);
    expect(tiles[0].sides).toBe(4);
  });

  it("reproduces Star of David's original 6-triangle ring geometry", () => {
    const maxRadius = 30;
    const innerHexRadius = maxRadius / Math.sqrt(3);
    const triangleRadius = maxRadius / 3;
    const helperRadius = innerHexRadius * Math.cos(Math.PI / 6) + triangleRadius / 2;
    const center = { x: 0, y: 0 };
    const rotation = 0.1;

    const expected: { center: { x: number; y: number }; baseRotation: number }[] = [];
    for (let t = 0; t < 6; t += 1) {
      const positionAngle = rotation + Math.PI / 6 + (t * Math.PI) / 3 - Math.PI / 2;
      expected.push({
        center: { x: center.x + helperRadius * Math.cos(positionAngle), y: center.y + helperRadius * Math.sin(positionAngle) },
        baseRotation: rotation + Math.PI / 6 + (t * Math.PI) / 3,
      });
    }

    const tiles = tileRingLayout(6, 3, helperRadius, Math.PI / 6, rotation, center, false);
    tiles.forEach((tile, i) => {
      expect(tile.center.x).toBeCloseTo(expected[i].center.x, 9);
      expect(tile.center.y).toBeCloseTo(expected[i].center.y, 9);
      expect(tile.baseRotation).toBeCloseTo(expected[i].baseRotation, 9);
    });
  });
});
