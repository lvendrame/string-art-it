import { describe, expect, it } from "vitest";
import { createPinPath, recomputePinPath } from "./pinPath";

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
