import { describe, expect, it } from "vitest";
import { pathLength } from "../../domain/paths";
import { boardHypotenuse, boardPath, clampDimension, defaultDimensionsFor } from "./board";
import type { Board } from "./board";

describe("defaultDimensionsFor", () => {
  it("gives each shape sane defaults", () => {
    expect(defaultDimensionsFor("circle")).toEqual({ diameter: 60 });
    expect(defaultDimensionsFor("triangle", "equilateral")).toEqual({ side: 50 });
    expect(defaultDimensionsFor("triangle", "right-angled")).toEqual({ base: 40, height: 30 });
  });
});

describe("clampDimension", () => {
  it("rejects zero/negative values by clamping to the minimum", () => {
    expect(clampDimension(0)).toBeGreaterThan(0);
    expect(clampDimension(-5)).toBeGreaterThan(0);
  });

  it("passes through valid positive values", () => {
    expect(clampDimension(42)).toBe(42);
  });
});

describe("boardHypotenuse", () => {
  it("computes the hypotenuse for a right-angled triangle board", () => {
    const board: Board = {
      shape: "triangle",
      triangleType: "right-angled",
      dimensions: { base: 40, height: 30 },
      appearance: { type: "solid", colour: "#000" },
    };
    expect(boardHypotenuse(board)).toBeCloseTo(50, 6);
  });

  it("is null for non-right-triangle boards", () => {
    const board: Board = {
      shape: "circle",
      dimensions: { diameter: 60 },
      appearance: { type: "solid", colour: "#000" },
    };
    expect(boardHypotenuse(board)).toBeNull();
  });
});

describe("boardPath", () => {
  it("circle board has true circumference", () => {
    const board: Board = {
      shape: "circle",
      dimensions: { diameter: 60 },
      appearance: { type: "solid", colour: "#000" },
    };
    expect(pathLength(boardPath(board))).toBeCloseTo(Math.PI * 60, 6);
  });

  it("equilateral triangle board has three equal sides", () => {
    const board: Board = {
      shape: "triangle",
      triangleType: "equilateral",
      dimensions: { side: 50 },
      appearance: { type: "solid", colour: "#000" },
    };
    const path = boardPath(board);
    for (const segment of path.segments) expect(segment.length()).toBeCloseTo(50, 6);
  });
});
