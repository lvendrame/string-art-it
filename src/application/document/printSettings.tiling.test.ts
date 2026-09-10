import { describe, expect, it } from "vitest";
import { computeCorrectionFactor, computeEffectiveScale, computeTileGrid } from "./printSettings";

describe("computeCorrectionFactor", () => {
  it("is 1 when measured matches requested exactly", () => {
    expect(computeCorrectionFactor(10, 10)).toBe(1);
  });

  it("derives a factor > 1 when the print came out smaller than requested", () => {
    expect(computeCorrectionFactor(10, 9.8)).toBeCloseTo(10 / 9.8, 6);
  });

  it("derives a factor < 1 when the print came out larger than requested", () => {
    expect(computeCorrectionFactor(10, 10.2)).toBeCloseTo(10 / 10.2, 6);
  });

  it("guards against a zero/negative measurement", () => {
    expect(computeCorrectionFactor(10, 0)).toBe(1);
  });
});

describe("computeEffectiveScale with calibration", () => {
  it("1:1 scale is multiplied by the correction factor", () => {
    const factor = computeCorrectionFactor(10, 9.8);
    const scale = computeEffectiveScale({ mode: "1:1", customRatio: 1 }, { width: 60, height: 40 }, { width: 21, height: 29.7 }, 1, factor);
    expect(scale).toBeCloseTo(factor, 6);
  });

  it("fit and custom modes ignore the correction factor", () => {
    const factor = 1.5;
    expect(computeEffectiveScale({ mode: "custom", customRatio: 0.5 }, { width: 60, height: 40 }, { width: 21, height: 29.7 }, 1, factor)).toBe(0.5);
  });
});

describe("computeTileGrid", () => {
  it("a single-page-sized board needs only one tile", () => {
    const grid = computeTileGrid({ width: 15, height: 20 }, { width: 19, height: 27.7 }, 1);
    expect(grid).toEqual({ cols: 1, rows: 1, tiles: [{ col: 0, row: 0, x: 0, y: 0, width: 19, height: 27.7 }] });
  });

  it("content wider than one page splits into multiple columns with overlap", () => {
    // content 50cm wide, tile usable width 19cm, overlap 1cm -> step 18cm
    // cols = ceil((50-1)/18) = ceil(49/18) = 3
    const grid = computeTileGrid({ width: 50, height: 20 }, { width: 19, height: 27.7 }, 1);
    expect(grid.cols).toBe(3);
    expect(grid.tiles[1].x).toBeCloseTo(18, 6); // second tile starts one step in
  });

  it("adjacent tiles overlap by the configured amount", () => {
    const grid = computeTileGrid({ width: 50, height: 20 }, { width: 19, height: 27.7 }, 1);
    const tile0End = grid.tiles[0].x + grid.tiles[0].width;
    const tile1Start = grid.tiles[1].x;
    expect(tile0End - tile1Start).toBeCloseTo(1, 6); // 1cm overlap
  });

  it("splits into rows when content is taller than one page", () => {
    const grid = computeTileGrid({ width: 15, height: 50 }, { width: 19, height: 27.7 }, 1);
    expect(grid.rows).toBeGreaterThan(1);
  });
});
