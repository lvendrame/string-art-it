import { describe, expect, it } from "vitest";
import { createPinPath, geometryCenter, recomputePinPath, scaleGeometry, scaleGeometryAboutPivot } from "./pinPath";

const STYLE = { colour: "#fff", diameter: 2, guideVisible: true };

describe("createPinPath — open path", () => {
  it("8cm line / 1cm spacing -> 9 pins, actualSpacing == requested", () => {
    const path = createPinPath({ type: "line", start: { x: 0, y: 0 }, end: { x: 8, y: 0 } }, 1, STYLE);
    expect(path.pins).toHaveLength(9);
    expect(path.actualSpacing).toBe(1);
  });

  it("line is vertex-anchored: both endpoints are always pinned, even on non-exact division", () => {
    const path = createPinPath({ type: "line", start: { x: 0, y: 0 }, end: { x: 7.5, y: 0 } }, 1, STYLE);
    expect(path.pins).toHaveLength(9);
    expect(path.pins[0]).toMatchObject({ x: 0, y: 0 });
    expect(path.pins.at(-1)).toMatchObject({ x: 7.5, y: 0 });
  });

  it("freehand distributes pins along the hand-drawn point sequence like any other open path", () => {
    const path = createPinPath(
      { type: "freehand", points: [{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 10, y: 0 }] },
      1,
      STYLE,
    );
    expect(path.pins).toHaveLength(11);
    expect(path.actualSpacing).toBe(1);
    expect(path.pins[0]).toMatchObject({ x: 0, y: 0 });
    expect(path.pins.at(-1)).toMatchObject({ x: 10, y: 0 });
  });
});

describe("createPinPath — closed path", () => {
  it("circle uses the closed-path uniform-spacing algorithm", () => {
    const path = createPinPath({ type: "circle", center: { x: 0, y: 0 }, radius: 31 / (2 * Math.PI) }, 2, STYLE);
    expect(path.pins).toHaveLength(16);
    expect(path.actualSpacing).toBeCloseTo(1.9375, 3);
  });

  it("every pin gets a stable, unique id", () => {
    const path = createPinPath({ type: "circle", center: { x: 0, y: 0 }, radius: 10 }, 2, STYLE);
    const ids = new Set(path.pins.map((p) => p.id));
    expect(ids.size).toBe(path.pins.length);
  });

  it("rectangle is vertex-anchored: all 4 corners are present in the pins", () => {
    const path = createPinPath({ type: "rectangle", position: { x: 0, y: 0 }, width: 10, height: 4, rotation: 0 }, 3, STYLE);
    const corners = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 4 }, { x: 0, y: 4 }];
    for (const corner of corners) {
      expect(path.pins.some((p) => p.x === corner.x && p.y === corner.y)).toBe(true);
    }
  });

  it("regular polygon (hexagon) is vertex-anchored: all 6 vertices are present in the pins", () => {
    const geometry = { type: "regular-polygon" as const, center: { x: 0, y: 0 }, radius: 5, sides: 6, rotation: 0 };
    const path = createPinPath(geometry, 2, STYLE);
    const vertices = Array.from({ length: 6 }, (_, i) => {
      const angle = (2 * Math.PI * i) / 6 - Math.PI / 2;
      return { x: 5 * Math.cos(angle), y: 5 * Math.sin(angle) };
    });
    for (const vertex of vertices) {
      expect(
        path.pins.some((p) => Math.abs(p.x - vertex.x) < 1e-9 && Math.abs(p.y - vertex.y) < 1e-9),
      ).toBe(true);
    }
  });
});

describe("recomputePinPath", () => {
  it("changing requested spacing recalculates pin count", () => {
    const path = createPinPath({ type: "line", start: { x: 0, y: 0 }, end: { x: 8, y: 0 } }, 1, STYLE);
    const resized = recomputePinPath({ ...path, requestedSpacing: 2 });
    expect(resized.pins).toHaveLength(5);
  });

  it("changing geometry recalculates pins", () => {
    const path = createPinPath({ type: "circle", center: { x: 0, y: 0 }, radius: 5 }, 1, STYLE);
    const before = path.pins.length;
    const resized = recomputePinPath({ ...path, geometry: { type: "circle", center: { x: 0, y: 0 }, radius: 8 } });
    expect(resized.pins.length).not.toBe(before);
  });

  it("rotation changes pin positions without changing pin count", () => {
    const geometry = { type: "regular-polygon" as const, center: { x: 0, y: 0 }, radius: 10, sides: 6, rotation: 0 };
    const path = createPinPath(geometry, 3, STYLE);
    const rotated = recomputePinPath({ ...path, geometry: { ...geometry, rotation: Math.PI / 6 } });
    expect(rotated.pins).toHaveLength(path.pins.length);
    expect(rotated.pins[0]).not.toEqual(path.pins[0]);
  });
});

// docs/specs/26-edit-mode-multi-select.md — scaleGeometryAboutPivot is the general
// form scaleGeometry (docs/specs/21-scale-and-pin-distance.md) delegates to with
// pivot=geometryCenter; these prove that delegation is byte-identical, and that an
// external pivot behaves like a standard scale-about-point transform.
describe("scaleGeometryAboutPivot", () => {
  it("pivot = geometryCenter reproduces scaleGeometry exactly, for every shape kind", () => {
    const geometries = [
      { type: "line" as const, start: { x: 2, y: 3 }, end: { x: 8, y: 5 } },
      { type: "arc" as const, start: { x: 0, y: 0 }, end: { x: 10, y: 0 }, curvature: 2 },
      { type: "circle" as const, center: { x: 4, y: 4 }, radius: 5 },
      { type: "ellipse" as const, center: { x: 1, y: 2 }, radiusX: 5, radiusY: 3, rotation: 0.3 },
      { type: "rectangle" as const, position: { x: 1, y: 1 }, width: 6, height: 4, rotation: 0 },
      { type: "square" as const, position: { x: 2, y: 2 }, side: 5, rotation: 0 },
      { type: "regular-polygon" as const, center: { x: 3, y: 3 }, radius: 5, sides: 6, rotation: 0 },
      { type: "star" as const, center: { x: 0, y: 0 }, outerRadius: 6, innerRadius: 3, points: 5, rotation: 0 },
      { type: "polygram" as const, center: { x: 0, y: 0 }, radius: 6, points: 7, skip: 2, rotation: 0 },
      { type: "freehand" as const, points: [{ x: 0, y: 0 }, { x: 5, y: 2 }, { x: 3, y: 7 }] },
    ];
    for (const geometry of geometries) {
      const factor = 1.7;
      const expected = scaleGeometry(geometry, factor);
      const actual = scaleGeometryAboutPivot(geometry, geometryCenter(geometry), factor);
      expect(actual).toEqual(expected);
    }
  });

  it("an external pivot moves the shape's own centre toward/away from that pivot", () => {
    const geometry = { type: "circle" as const, center: { x: 10, y: 0 }, radius: 2 };
    const pivot = { x: 0, y: 0 };
    const scaled = scaleGeometryAboutPivot(geometry, pivot, 2);
    expect(scaled).toMatchObject({ center: { x: 20, y: 0 }, radius: 4 });
  });

  it("rectangle centre moves correctly about an external pivot, not just its size", () => {
    const geometry = { type: "rectangle" as const, position: { x: 4, y: 4 }, width: 2, height: 2, rotation: 0 };
    // centre is (5,5); scaling by 2 about the origin should move the centre to (10,10)
    const pivot = { x: 0, y: 0 };
    const scaled = scaleGeometryAboutPivot(geometry, pivot, 2);
    if (scaled.type !== "rectangle") throw new Error("expected a rectangle");
    expect(scaled.width).toBe(4);
    expect(scaled.height).toBe(4);
    expect(scaled.position).toEqual({ x: 8, y: 8 }); // centre (10,10) - half-size (2,2)
  });
});
