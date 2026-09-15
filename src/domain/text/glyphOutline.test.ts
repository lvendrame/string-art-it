import { describe, expect, it } from "vitest";
import { commandsToContours, type GlyphCommand } from "./glyphOutline";

describe("commandsToContours", () => {
  it("a single M/L/L/Z square produces one 4-point contour", () => {
    const commands: GlyphCommand[] = [
      { type: "M", x: 0, y: 0 },
      { type: "L", x: 10, y: 0 },
      { type: "L", x: 10, y: 10 },
      { type: "L", x: 0, y: 10 },
      { type: "Z" },
    ];
    const contours = commandsToContours(commands);
    expect(contours).toHaveLength(1);
    expect(contours[0]).toEqual([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }]);
  });

  it("an 'o'-shaped outer ring + inner hole produces two contours", () => {
    const commands: GlyphCommand[] = [
      { type: "M", x: 0, y: 0 },
      { type: "L", x: 10, y: 0 },
      { type: "L", x: 10, y: 10 },
      { type: "Z" },
      { type: "M", x: 2, y: 2 },
      { type: "L", x: 8, y: 2 },
      { type: "L", x: 8, y: 8 },
      { type: "Z" },
    ];
    const contours = commandsToContours(commands);
    expect(contours).toHaveLength(2);
    expect(contours[0]).toHaveLength(3);
    expect(contours[1]).toHaveLength(3);
  });

  it("a cubic curve is subdivided into multiple points along the curve, not just its endpoints", () => {
    const commands: GlyphCommand[] = [
      { type: "M", x: 0, y: 0 },
      { type: "C", x1: 0, y1: 10, x2: 10, y2: 10, x: 10, y: 0 },
      { type: "Z" },
    ];
    const contours = commandsToContours(commands, 4);
    // 1 start point (M) + 4 subdivision points (C) = 5
    expect(contours[0]).toHaveLength(5);
    // The curve bulges upward (control points at y=10) — some intermediate point must
    // have y > 0, proving it's not just a straight line from start to end.
    expect(contours[0].some((p) => p.y > 0.1)).toBe(true);
    // Endpoint of the curve matches the command's target.
    expect(contours[0][contours[0].length - 1]).toEqual({ x: 10, y: 0 });
  });

  it("a quadratic curve is subdivided the same way", () => {
    const commands: GlyphCommand[] = [
      { type: "M", x: 0, y: 0 },
      { type: "Q", x1: 5, y1: 10, x: 10, y: 0 },
      { type: "Z" },
    ];
    const contours = commandsToContours(commands, 4);
    expect(contours[0]).toHaveLength(5);
    expect(contours[0].some((p) => p.y > 0.1)).toBe(true);
  });

  it("a missing trailing Z still closes out the current contour", () => {
    const commands: GlyphCommand[] = [
      { type: "M", x: 0, y: 0 },
      { type: "L", x: 1, y: 0 },
      { type: "L", x: 1, y: 1 },
    ];
    expect(commandsToContours(commands)).toHaveLength(1);
  });

  it("no commands produces no contours", () => {
    expect(commandsToContours([])).toHaveLength(0);
  });
});
