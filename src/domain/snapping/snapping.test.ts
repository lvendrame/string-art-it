import { describe, expect, it } from "vitest";
import { snapToGrid } from "./grid";
import { findNearestPin, type SnapPin } from "./pins";
import { resolveSnapPosition } from "./pipeline";
import type { Viewport } from "../transforms";

describe("snapToGrid", () => {
  it("snaps to the nearest grid intersection", () => {
    expect(snapToGrid({ x: 1.2, y: 1.8 }, { x: 1, y: 1 })).toEqual({ x: 1, y: 2 });
  });
});

describe("findNearestPin", () => {
  const pins: SnapPin[] = [
    { id: "a", x: 0, y: 0 },
    { id: "b", x: 10, y: 0 },
  ];

  it("returns the nearest pin within radius", () => {
    expect(findNearestPin({ x: 1, y: 0 }, pins, 5)?.id).toBe("a");
  });

  it("returns null when no pin is within radius", () => {
    expect(findNearestPin({ x: 4.9, y: 0 }, pins, 2)).toBeNull();
  });
});

describe("resolveSnapPosition (deterministic priority)", () => {
  const viewport: Viewport = { zoom: 2, panOrigin: { x: 0, y: 0 } };
  const pins: SnapPin[] = [{ id: "p1", x: 5.02, y: 5.02 }];

  it("pin snap takes priority over grid snap when both are in range", () => {
    const result = resolveSnapPosition(
      { x: 5, y: 5 },
      {
        pins,
        pinSnapEnabled: true,
        snapRadiusPx: 20, // 10 document units at zoom 2
        gridSnapEnabled: true,
        gridGap: { x: 1, y: 1 },
        viewport,
      },
    );
    expect(result.source).toBe("pin");
    expect(result.point).toEqual({ x: 5.02, y: 5.02 });
  });

  it("falls back to grid snap when no pin is in range", () => {
    const result = resolveSnapPosition(
      { x: 5.4, y: 5.4 },
      {
        pins: [],
        pinSnapEnabled: true,
        snapRadiusPx: 20,
        gridSnapEnabled: true,
        gridGap: { x: 1, y: 1 },
        viewport,
      },
    );
    expect(result.source).toBe("grid");
    expect(result.point).toEqual({ x: 5, y: 5 });
  });

  it("falls back to raw position when neither snap applies", () => {
    const result = resolveSnapPosition(
      { x: 5.4, y: 5.4 },
      {
        pins: [],
        pinSnapEnabled: false,
        snapRadiusPx: 20,
        gridSnapEnabled: false,
        gridGap: { x: 1, y: 1 },
        viewport,
      },
    );
    expect(result.source).toBe("raw");
    expect(result.point).toEqual({ x: 5.4, y: 5.4 });
  });

  it("pin snap radius is screen-space: same pixel radius covers less document distance at higher zoom", () => {
    const farPin: SnapPin[] = [{ id: "p1", x: 5.4, y: 5 }]; // 0.4 doc units away
    const lowZoom: Viewport = { zoom: 1, panOrigin: { x: 0, y: 0 } };
    const highZoom: Viewport = { zoom: 100, panOrigin: { x: 0, y: 0 } };
    const opts = (viewport: Viewport) => ({
      pins: farPin,
      pinSnapEnabled: true,
      snapRadiusPx: 10, // 10 doc units at zoom 1, 0.1 doc units at zoom 100
      gridSnapEnabled: false,
      gridGap: { x: 1, y: 1 },
      viewport,
    });

    expect(resolveSnapPosition({ x: 5, y: 5 }, opts(lowZoom)).source).toBe("pin");
    expect(resolveSnapPosition({ x: 5, y: 5 }, opts(highZoom)).source).toBe("raw");
  });
});
