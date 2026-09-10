import { describe, expect, it } from "vitest";
import { createPinPath, recomputePinPath } from "./pinPath";

const STYLE = { colour: "#fff", diameter: 2, guideVisible: true };

describe("createPinPath — open path", () => {
  it("8cm line / 1cm spacing -> 9 pins, actualSpacing == requested", () => {
    const path = createPinPath({ type: "line", start: { x: 0, y: 0 }, end: { x: 8, y: 0 } }, 1, STYLE);
    expect(path.pins).toHaveLength(9);
    expect(path.actualSpacing).toBe(1);
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
