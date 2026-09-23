import { describe, expect, it } from "vitest";
import { arcShape, circleShape, ellipseShape, rectangleShape } from "@domain/shapes";
import { CircularArcSegment, EllipticalArcSegment } from "@domain/paths";
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

  it("renders a partial circular arc as a single A command", () => {
    const d = pathToSvgD(arcShape({ x: 0, y: 0 }, { x: 10, y: 0 }, 3));
    const arcCount = (d.match(/A /g) ?? []).length;
    expect(arcCount).toBe(1);
    expect(d.endsWith("Z")).toBe(false);
  });

  it("renders a full ellipse as two half-arcs, with rotation carried through", () => {
    const d = pathToSvgD(ellipseShape({ x: 0, y: 0 }, 8, 4, Math.PI / 4));
    const arcCount = (d.match(/A /g) ?? []).length;
    expect(arcCount).toBe(2);
    expect(d).toContain("45");
  });

  it("sets the large-arc-flag for a circular arc sweeping more than 180deg", () => {
    const segment = new CircularArcSegment({ x: 0, y: 0 }, 5, 0, (3 * Math.PI) / 2);
    const d = pathToSvgD({ closed: false, segments: [segment] });
    expect(d).toMatch(/A 5 5 0 1 1 /);
  });

  it("clears the large-arc-flag for a circular arc sweeping less than 180deg", () => {
    const segment = new CircularArcSegment({ x: 0, y: 0 }, 5, 0, Math.PI / 2);
    const d = pathToSvgD({ closed: false, segments: [segment] });
    expect(d).toMatch(/A 5 5 0 0 1 /);
  });

  it("renders a partial elliptical arc as a single A command", () => {
    const segment = new EllipticalArcSegment({ x: 0, y: 0 }, 8, 4, 0, 0, Math.PI / 2);
    const d = pathToSvgD({ closed: false, segments: [segment] });
    const arcCount = (d.match(/A /g) ?? []).length;
    expect(arcCount).toBe(1);
  });

  it("clears the sweep-flag for a clockwise (negative sweep) circular arc", () => {
    const segment = new CircularArcSegment({ x: 0, y: 0 }, 5, 0, -Math.PI / 2);
    const d = pathToSvgD({ closed: false, segments: [segment] });
    expect(d).toMatch(/A 5 5 0 0 0 /);
  });

  it("sets the large-arc-flag for an elliptical arc sweeping more than 180deg", () => {
    const segment = new EllipticalArcSegment({ x: 0, y: 0 }, 8, 4, 0, 0, (3 * Math.PI) / 2);
    const d = pathToSvgD({ closed: false, segments: [segment] });
    expect(d).toMatch(/A 8 4 0 1 1 /);
  });
});
