import { describe, expect, it } from "vitest";
import {
  getCanvasViewportCenter,
  getCanvasViewportSize,
  keepViewportCentered,
  setCanvasViewportSize,
} from "./canvasViewportSize";

describe("canvasViewportSize", () => {
  it("ignores non-positive sizes", () => {
    const before = getCanvasViewportSize();
    setCanvasViewportSize({ width: 0, height: 500 });
    expect(getCanvasViewportSize()).toBe(before);
  });

  it("stores the measured size and derives the centre from it", () => {
    setCanvasViewportSize({ width: 1000, height: 800 });
    expect(getCanvasViewportSize()).toEqual({ width: 1000, height: 800 });
    expect(getCanvasViewportCenter()).toEqual({ x: 500, y: 400 });
  });

  it("keeps the view centre fixed when the viewport grows", () => {
    const viewport = { zoom: 2, panOrigin: { x: 10, y: 20 } };
    const next = keepViewportCentered(viewport, { width: 400, height: 300 }, { width: 600, height: 500 });
    expect(next).toEqual({ zoom: 2, panOrigin: { x: -40, y: -30 } });
  });
});
