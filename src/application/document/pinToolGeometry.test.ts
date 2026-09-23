import { describe, expect, it } from "vitest";
import { curvatureFromCursor, geometryFromDrag } from "./pinToolGeometry";

describe("geometryFromDrag", () => {
  it("ellipse drag produces a bounding-box ellipse", () => {
    const g = geometryFromDrag("ellipse", { x: 0, y: 0 }, { x: 10, y: 4 }, false);
    expect(g).toEqual({ type: "ellipse", center: { x: 5, y: 2 }, radiusX: 5, radiusY: 2, rotation: 0 });
  });

  it("Alt+Ellipse constrains to a circle", () => {
    const g = geometryFromDrag("ellipse", { x: 0, y: 0 }, { x: 10, y: 4 }, true);
    expect(g?.type).toBe("ellipse");
    if (g?.type === "ellipse") expect(g.radiusX).toBe(g.radiusY);
  });

  it("Alt+Rectangle constrains to a square", () => {
    const g = geometryFromDrag("rectangle", { x: 0, y: 0 }, { x: 10, y: 4 }, true);
    expect(g?.type).toBe("rectangle");
    if (g?.type === "rectangle") expect(g.width).toBe(g.height);
  });

  it("polygon-family tools drag from centre outward", () => {
    const g = geometryFromDrag("hexagon", { x: 0, y: 0 }, { x: 10, y: 0 }, false);
    expect(g).toEqual({ type: "regular-polygon", center: { x: 0, y: 0 }, radius: 10, sides: 6, rotation: 0 });
  });

  it("circle drag from centre outward (matches polygon/star family)", () => {
    const g = geometryFromDrag("circle", { x: 0, y: 0 }, { x: 10, y: 0 }, false);
    expect(g).toEqual({ type: "circle", center: { x: 0, y: 0 }, radius: 10 });
  });

  it("line drag maps p0/p1 directly to start/end", () => {
    const g = geometryFromDrag("line", { x: 0, y: 0 }, { x: 10, y: 4 }, false);
    expect(g).toEqual({ type: "line", start: { x: 0, y: 0 }, end: { x: 10, y: 4 } });
  });

  it("line drag with no movement (a plain click) returns null", () => {
    expect(geometryFromDrag("line", { x: 5, y: 5 }, { x: 5, y: 5 }, false)).toBeNull();
  });

  it("returns null for arc/eraser (handled by their own interaction models)", () => {
    expect(geometryFromDrag("arc", { x: 0, y: 0 }, { x: 1, y: 1 }, false)).toBeNull();
    expect(geometryFromDrag("eraser", { x: 0, y: 0 }, { x: 1, y: 1 }, false)).toBeNull();
  });

  it("square drag takes the larger of width/height for the side", () => {
    const g = geometryFromDrag("square", { x: 0, y: 0 }, { x: 10, y: 4 }, false);
    expect(g).toEqual({ type: "square", position: { x: 0, y: 0 }, side: 10, rotation: 0 });
  });

  it("a zero-size square drag clamps to the minimum size", () => {
    const g = geometryFromDrag("square", { x: 5, y: 5 }, { x: 5, y: 5 }, false);
    expect(g?.type).toBe("square");
    if (g?.type === "square") expect(g.side).toBeGreaterThan(0);
  });

  it("a zero-size ellipse drag clamps radii to the minimum size", () => {
    const g = geometryFromDrag("ellipse", { x: 5, y: 5 }, { x: 5, y: 5 }, false);
    expect(g?.type).toBe("ellipse");
    if (g?.type === "ellipse") {
      expect(g.radiusX).toBeGreaterThan(0);
      expect(g.radiusY).toBeGreaterThan(0);
    }
  });

  it("a zero-size rectangle drag clamps dimensions to the minimum size", () => {
    const g = geometryFromDrag("rectangle", { x: 5, y: 5 }, { x: 5, y: 5 }, false);
    expect(g?.type).toBe("rectangle");
    if (g?.type === "rectangle") {
      expect(g.width).toBeGreaterThan(0);
      expect(g.height).toBeGreaterThan(0);
    }
  });

  it("pentagon/octagon drag from centre outward", () => {
    expect(geometryFromDrag("pentagon", { x: 0, y: 0 }, { x: 10, y: 0 }, false)).toEqual({
      type: "regular-polygon", center: { x: 0, y: 0 }, radius: 10, sides: 5, rotation: 0,
    });
    expect(geometryFromDrag("octagon", { x: 0, y: 0 }, { x: 10, y: 0 }, false)).toEqual({
      type: "regular-polygon", center: { x: 0, y: 0 }, radius: 10, sides: 8, rotation: 0,
    });
  });

  it("a zero-length drag clamps the radius to the minimum size", () => {
    const g = geometryFromDrag("hexagon", { x: 5, y: 5 }, { x: 5, y: 5 }, false);
    expect(g?.type).toBe("regular-polygon");
    if (g?.type === "regular-polygon") expect(g.radius).toBeGreaterThan(0);
  });

  it("star-5/star-6/star-8 drag from centre with an inner radius half the outer", () => {
    for (const [tool, points] of [["star-5", 5], ["star-6", 6], ["star-8", 8]] as const) {
      const g = geometryFromDrag(tool, { x: 0, y: 0 }, { x: 10, y: 0 }, false);
      expect(g).toEqual({ type: "star", center: { x: 0, y: 0 }, outerRadius: 10, innerRadius: 5, points, rotation: 0 });
    }
  });

  it("pentagram/heptagram/octagram drag from centre outward", () => {
    expect(geometryFromDrag("pentagram", { x: 0, y: 0 }, { x: 10, y: 0 }, false)?.type).toBe("polygram");
    expect(geometryFromDrag("heptagram", { x: 0, y: 0 }, { x: 10, y: 0 }, false)?.type).toBe("polygram");
    expect(geometryFromDrag("octagram", { x: 0, y: 0 }, { x: 10, y: 0 }, false)?.type).toBe("polygram");
  });
});

describe("curvatureFromCursor", () => {
  it("is zero when the cursor sits on the chord", () => {
    expect(curvatureFromCursor({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 0 })).toBeCloseTo(0, 6);
  });

  it("is the perpendicular distance from the chord midpoint", () => {
    expect(curvatureFromCursor({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 3 })).toBeCloseTo(3, 6);
  });

  it("is zero for a degenerate (zero-length) chord", () => {
    expect(curvatureFromCursor({ x: 5, y: 5 }, { x: 5, y: 5 }, { x: 8, y: 8 })).toBe(0);
  });
});
