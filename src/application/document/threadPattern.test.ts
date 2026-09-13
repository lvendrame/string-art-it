import { describe, expect, it } from "vitest";
import { computeNextPatternPinId, findPinPosition } from "./threadPattern";
import type { PinLayer } from "./pinLayer";
import type { Pin } from "./pinPath";

function pin(id: string, x: number, y: number): Pin {
  return { id, x, y };
}

// One layer, one Pin Path with `count` pins numbered "p1".."pN" in position order
// (pins[0] is "Pin 1", matching the same 1-based convention used by Print
// Preview/SVG export).
function makeLayer(count: number, pathId = "path-a"): PinLayer[] {
  const pins = Array.from({ length: count }, (_, i) => pin(`p${i + 1}`, i, 0));
  return [
    {
      id: "layer-1",
      name: "Layer 1",
      visible: true,
      locked: false,
      pinPaths: [
        {
          id: pathId,
          geometry: { type: "line", start: { x: 0, y: 0 }, end: { x: count, y: 0 } },
          requestedSpacing: 1,
          actualSpacing: 1,
          pins,
          guideVisible: true,
          colour: "#fff",
          diameter: 2,
          symmetry: { type: "none" },
        },
      ],
    },
  ];
}

// Two Pin Paths in the same layer: "small" (few pins) and "big" (many pins), so a
// draft can mix vertices from differently-sized paths.
function makeTwoPaths(smallCount: number, bigCount: number): PinLayer[] {
  const smallPins = Array.from({ length: smallCount }, (_, i) => pin(`s${i + 1}`, i, 0));
  const bigPins = Array.from({ length: bigCount }, (_, i) => pin(`b${i + 1}`, i, 10));
  return [
    {
      id: "layer-1",
      name: "Layer 1",
      visible: true,
      locked: false,
      pinPaths: [
        { id: "small", geometry: { type: "line", start: { x: 0, y: 0 }, end: { x: smallCount, y: 0 } }, requestedSpacing: 1, actualSpacing: 1, pins: smallPins, guideVisible: true, colour: "#fff", diameter: 2, symmetry: { type: "none" } },
        { id: "big", geometry: { type: "line", start: { x: 0, y: 10 }, end: { x: bigCount, y: 10 } }, requestedSpacing: 1, actualSpacing: 1, pins: bigPins, guideVisible: true, colour: "#fff", diameter: 2, symmetry: { type: "none" } },
      ],
    },
  ];
}

describe("findPinPosition", () => {
  it("finds a pin's path and 0-based index", () => {
    const layers = makeLayer(5);
    const found = findPinPosition(layers, "p3");
    expect(found?.index).toBe(2);
    expect(found?.path.id).toBe("path-a");
  });

  it("returns undefined for an id not present in any path's `pins` (e.g. a mirrored pin id)", () => {
    const layers = makeLayer(5);
    expect(findPinPosition(layers, "p3~mirror-x")).toBeUndefined();
  });
});

describe("computeNextPatternPinId", () => {
  it("returns undefined with fewer than 4 vertices", () => {
    const layers = makeLayer(20);
    expect(computeNextPatternPinId(layers, ["p3", "p15", "p4"])).toBeUndefined();
  });

  // Example 1: 3, 15, 4, 16 -> 5, then 17, then 6 (two paths, "small" holds 3/4/5/6,
  // "big" holds 15/16/17).
  it("example 1 — two interleaved sequences across differently-sized paths", () => {
    const layers = makeTwoPaths(10, 20);
    let pinIds = ["s3", "b15", "s4", "b16"];

    let next = computeNextPatternPinId(layers, pinIds);
    expect(next).toBe("s5");
    pinIds = [...pinIds, next!];

    next = computeNextPatternPinId(layers, pinIds);
    expect(next).toBe("b17");
    pinIds = [...pinIds, next!];

    next = computeNextPatternPinId(layers, pinIds);
    expect(next).toBe("s6");
  });

  // Example 2: 3, 15, 4, 14 -> 5, then 13, then 6, then 12 (negative step group).
  it("example 2 — a group with a negative step", () => {
    const layers = makeTwoPaths(10, 20);
    let pinIds = ["s3", "b15", "s4", "b14"];

    let next = computeNextPatternPinId(layers, pinIds);
    expect(next).toBe("s5");
    pinIds = [...pinIds, next!];

    next = computeNextPatternPinId(layers, pinIds);
    expect(next).toBe("b13");
    pinIds = [...pinIds, next!];

    next = computeNextPatternPinId(layers, pinIds);
    expect(next).toBe("s6");
    pinIds = [...pinIds, next!];

    next = computeNextPatternPinId(layers, pinIds);
    expect(next).toBe("b12");
  });

  // Example 3: 3, 6, 9, 12 (single path, no wraparound needed) -> 15, 18, 21, 24.
  it("example 3 — single path, no wraparound", () => {
    const layers = makeLayer(30);
    let pinIds = ["p3", "p6", "p9", "p12"];

    for (const expected of ["p15", "p18", "p21", "p24"]) {
      const next = computeNextPatternPinId(layers, pinIds);
      expect(next).toBe(expected);
      pinIds = [...pinIds, next!];
    }
  });

  // Example 4: same 3, 6, 9, 12 but on a 16-pin path -> 15, 2, 5, 8 (wraparound).
  it("example 4 — single 16-pin path, wraps around", () => {
    const layers = makeLayer(16);
    let pinIds = ["p3", "p6", "p9", "p12"];

    for (const expected of ["p15", "p2", "p5", "p8"]) {
      const next = computeNextPatternPinId(layers, pinIds);
      expect(next).toBe(expected);
      pinIds = [...pinIds, next!];
    }
  });

  it("no-ops (returns undefined) when a relevant vertex is a mirrored pin id", () => {
    // Active group for the 5th vertex is positions 1 & 3 (indices 0, 2) — put the
    // mirrored id there so it's the group actually being extrapolated.
    const layers = makeLayer(20);
    const pinIds = ["p3~mirror-1", "p15", "p4", "p16"];
    expect(computeNextPatternPinId(layers, pinIds)).toBeUndefined();
  });
});
