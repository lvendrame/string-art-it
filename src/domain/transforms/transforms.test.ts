import { describe, expect, it } from "vitest";
import { rotatePoint, boundingBoxOf } from "./point";
import {
  toScreen,
  toDocument,
  screenDistanceToDocument,
  fitToViewport,
  zoomToPercent,
  percentToZoom,
  CSS_PIXELS_PER_CM,
  type Viewport,
} from "./viewport";

describe("rotatePoint", () => {
  it("rotates 90 degrees about a pivot", () => {
    const result = rotatePoint({ x: 1, y: 0 }, { x: 0, y: 0 }, Math.PI / 2);
    expect(result.x).toBeCloseTo(0, 6);
    expect(result.y).toBeCloseTo(1, 6);
  });
});

describe("boundingBoxOf", () => {
  it("computes the min/max envelope of a point set", () => {
    const box = boundingBoxOf([{ x: -2, y: 5 }, { x: 4, y: -1 }]);
    expect(box).toEqual({ minX: -2, minY: -1, maxX: 4, maxY: 5 });
  });
});

describe("viewport transform", () => {
  const viewport: Viewport = { zoom: 2, panOrigin: { x: 10, y: 10 } };

  it("toScreen and toDocument are inverses", () => {
    const doc = { x: 15, y: 20 };
    const screen = toScreen(doc, viewport);
    expect(toDocument(screen, viewport)).toEqual(doc);
  });

  it("zoom changes screen output without touching document coordinates", () => {
    const doc = { x: 15, y: 20 };
    const at1x = toScreen(doc, { zoom: 1, panOrigin: { x: 0, y: 0 } });
    const at4x = toScreen(doc, { zoom: 4, panOrigin: { x: 0, y: 0 } });
    expect(at4x).toEqual({ x: at1x.x * 4, y: at1x.y * 4 });
  });

  it("screenDistanceToDocument scales inversely with zoom", () => {
    expect(screenDistanceToDocument(20, { zoom: 2, panOrigin: { x: 0, y: 0 } })).toBe(10);
    expect(screenDistanceToDocument(20, { zoom: 200, panOrigin: { x: 0, y: 0 } })).toBe(0.1);
  });
});

describe("zoomToPercent / percentToZoom", () => {
  it("100% is true physical 1:1 scale (CSS reference pixel: 96px/inch)", () => {
    expect(zoomToPercent(CSS_PIXELS_PER_CM)).toBeCloseTo(100, 6);
    expect(percentToZoom(100)).toBeCloseTo(CSS_PIXELS_PER_CM, 6);
  });

  it("a raw zoom of 1 (1 px per cm) is nowhere near 100% — this was the bug", () => {
    expect(zoomToPercent(1)).toBeCloseTo(100 / CSS_PIXELS_PER_CM, 6);
    expect(zoomToPercent(1)).toBeLessThan(3);
  });

  it("round-trips", () => {
    expect(zoomToPercent(percentToZoom(250))).toBeCloseTo(250, 6);
  });
});

describe("fitToViewport", () => {
  it("computes a zoom that fits the content box within the viewport", () => {
    const box = { minX: 0, minY: 0, maxX: 100, maxY: 50 };
    const viewport = fitToViewport(box, { width: 200, height: 200 }, 0);
    expect(viewport.zoom).toBeCloseTo(2, 6); // width-constrained: 100->200 needs 2x, height needs 4x, min is 2
  });
});
