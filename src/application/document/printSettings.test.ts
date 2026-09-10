import { describe, expect, it } from "vitest";
import { computeEffectiveScale, paperDimensionsCm } from "./printSettings";

describe("paperDimensionsCm", () => {
  it("A4 portrait is 21 x 29.7 cm", () => {
    expect(paperDimensionsCm({ size: "A4", customWidthCm: 0, customHeightCm: 0, orientation: "portrait" })).toEqual({ width: 21, height: 29.7 });
  });

  it("landscape swaps width and height", () => {
    expect(paperDimensionsCm({ size: "A4", customWidthCm: 0, customHeightCm: 0, orientation: "landscape" })).toEqual({ width: 29.7, height: 21 });
  });

  it("custom paper uses the provided dimensions", () => {
    expect(paperDimensionsCm({ size: "custom", customWidthCm: 50, customHeightCm: 70, orientation: "portrait" })).toEqual({ width: 50, height: 70 });
  });
});

describe("computeEffectiveScale", () => {
  it("1:1 always returns scale 1 regardless of board/paper size", () => {
    expect(computeEffectiveScale({ mode: "1:1", customRatio: 1 }, { width: 100, height: 100 }, { width: 21, height: 29.7 })).toBe(1);
  });

  it("custom returns the configured ratio directly", () => {
    expect(computeEffectiveScale({ mode: "custom", customRatio: 0.5 }, { width: 100, height: 100 }, { width: 21, height: 29.7 })).toBe(0.5);
  });

  it("fit scales the board down to the smaller of width/height constraints", () => {
    // board 60x40, paper A4 21x29.7, margin 1cm -> available 19x27.7
    const scale = computeEffectiveScale({ mode: "fit", customRatio: 1 }, { width: 60, height: 40 }, { width: 21, height: 29.7 }, 1);
    expect(scale).toBeCloseTo(19 / 60, 6);
  });
});
