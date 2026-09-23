import { describe, expect, it } from "vitest";
import { pathLength } from "@domain/paths";
import { boardHypotenuse, boardPath, clampDimension, createDefaultBoard, defaultDimensionsFor } from "./board";
import type { Board } from "./board";

describe("createDefaultBoard", () => {
  it("defaults to a circle, 60cm diameter, solid #3b3b3b", () => {
    expect(createDefaultBoard()).toEqual({
      shape: "circle",
      dimensions: { diameter: 60 },
      appearance: { type: "solid", colour: "#3b3b3b" },
    });
  });
});

describe("defaultDimensionsFor", () => {
  it("gives each shape sane defaults", () => {
    expect(defaultDimensionsFor("circle")).toEqual({ diameter: 60 });
    expect(defaultDimensionsFor("oval")).toEqual({ width: 60, height: 40 });
    expect(defaultDimensionsFor("rectangle")).toEqual({ width: 60, height: 40 });
    expect(defaultDimensionsFor("square")).toEqual({ side: 50 });
    expect(defaultDimensionsFor("triangle", "equilateral")).toEqual({ side: 50 });
    expect(defaultDimensionsFor("triangle", "right-angled")).toEqual({ base: 40, height: 30 });
    expect(defaultDimensionsFor("triangle")).toEqual({ side: 50 });
  });
});

describe("clampDimension", () => {
  it("rejects zero/negative values by clamping to the minimum", () => {
    expect(clampDimension(0)).toBeGreaterThan(0);
    expect(clampDimension(-5)).toBeGreaterThan(0);
  });

  it("rejects non-finite values by clamping to the minimum", () => {
    expect(clampDimension(NaN)).toBeGreaterThan(0);
    expect(clampDimension(Infinity)).toBeGreaterThan(0);
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

  it("is null for an equilateral triangle board", () => {
    const board: Board = {
      shape: "triangle",
      triangleType: "equilateral",
      dimensions: { side: 50 },
      appearance: { type: "solid", colour: "#000" },
    };
    expect(boardHypotenuse(board)).toBeNull();
  });

  it("falls back to 0 for missing base/height on a right-angled triangle", () => {
    const board: Board = {
      shape: "triangle",
      triangleType: "right-angled",
      dimensions: {},
      appearance: { type: "solid", colour: "#000" },
    };
    expect(boardHypotenuse(board)).toBe(0);
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

  it("circle board falls back to the default diameter when missing", () => {
    const board: Board = {
      shape: "circle",
      dimensions: {},
      appearance: { type: "solid", colour: "#000" },
    };
    expect(pathLength(boardPath(board))).toBeCloseTo(Math.PI * 60, 6);
  });

  it("oval board perimeter falls back to default dimensions when missing", () => {
    const board: Board = {
      shape: "oval",
      dimensions: {},
      appearance: { type: "solid", colour: "#000" },
    };
    expect(pathLength(boardPath(board))).toBeGreaterThan(0);
  });

  it("rectangle board has the expected perimeter, with defaults when dimensions are missing", () => {
    const board: Board = {
      shape: "rectangle",
      dimensions: { width: 20, height: 10 },
      appearance: { type: "solid", colour: "#000" },
    };
    expect(pathLength(boardPath(board))).toBeCloseTo(60, 6);

    const defaulted: Board = {
      shape: "rectangle",
      dimensions: {},
      appearance: { type: "solid", colour: "#000" },
    };
    expect(pathLength(boardPath(defaulted))).toBeCloseTo(200, 6);
  });

  it("square board has the expected perimeter, with a default when the side is missing", () => {
    const board: Board = {
      shape: "square",
      dimensions: { side: 10 },
      appearance: { type: "solid", colour: "#000" },
    };
    expect(pathLength(boardPath(board))).toBeCloseTo(40, 6);

    const defaulted: Board = {
      shape: "square",
      dimensions: {},
      appearance: { type: "solid", colour: "#000" },
    };
    expect(pathLength(boardPath(defaulted))).toBeCloseTo(200, 6);
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

  it("equilateral triangle board falls back to the default side when missing", () => {
    const board: Board = {
      shape: "triangle",
      triangleType: "equilateral",
      dimensions: {},
      appearance: { type: "solid", colour: "#000" },
    };
    const path = boardPath(board);
    for (const segment of path.segments) expect(segment.length()).toBeCloseTo(50, 6);
  });

  it("right-angled triangle board has base/height/hypotenuse sides, with defaults when missing", () => {
    const board: Board = {
      shape: "triangle",
      triangleType: "right-angled",
      dimensions: { base: 3, height: 4 },
      appearance: { type: "solid", colour: "#000" },
    };
    const lengths = boardPath(board).segments.map((s) => s.length()).sort((a, b) => a - b);
    expect(lengths[0]).toBeCloseTo(3, 6);
    expect(lengths[1]).toBeCloseTo(4, 6);
    expect(lengths[2]).toBeCloseTo(5, 6);

    const defaulted: Board = {
      shape: "triangle",
      triangleType: "right-angled",
      dimensions: {},
      appearance: { type: "solid", colour: "#000" },
    };
    expect(pathLength(boardPath(defaulted))).toBeGreaterThan(0);
  });
});
