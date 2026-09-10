import { describe, expect, it } from "vitest";
import { circleShape, rectangleShape } from "../../domain/shapes";
import { pathToSvgD } from "./svgPath";

describe("pathToSvgD", () => {
  it("renders a closed rectangle as M/L/Z", () => {
    const d = pathToSvgD(rectangleShape({ x: 0, y: 0 }, 10, 5));
    expect(d.startsWith("M")).toBe(true);
    expect(d.endsWith("Z")).toBe(true);
    expect(d).toContain("L");
  });

  it("renders a full circle as two half-arcs (SVG cannot express a 360deg arc in one command)", () => {
    const d = pathToSvgD(circleShape({ x: 0, y: 0 }, 5));
    const arcCount = (d.match(/A /g) ?? []).length;
    expect(arcCount).toBe(2);
    expect(d.endsWith("Z")).toBe(true);
  });
});
