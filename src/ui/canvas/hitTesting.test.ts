import { describe, expect, it } from "vitest";
import { pinPathsTouchingRect, pinsTouchingRect, type Rect } from "./hitTesting";
import { createPinPath, type Pin, type PinLayer, type PinPath } from "../../application/document";

const STYLE = { colour: "#fff", diameter: 2, guideVisible: true };

function pin(id: string, x: number, y: number): Pin {
  return { id, x, y };
}

function layerWithPath(layerId: string, path: PinPath): PinLayer {
  return { id: layerId, name: layerId, visible: true, locked: false, pinPaths: [path] };
}

describe("pinPathsTouchingRect", () => {
  it("includes a path if any real pin falls inside the rect, regardless of drag direction", () => {
    const path: PinPath = { ...createPinPath({ type: "line", start: { x: 0, y: 0 }, end: { x: 0, y: 0 } }, 1, STYLE), pins: [pin("p1", 5, 5)] };
    const layers = [layerWithPath("layer-1", path)];
    // rect dragged bottom-right -> top-left (reversed corners)
    const rect: Rect = { x0: 10, y0: 10, x1: 0, y1: 0 };
    expect(pinPathsTouchingRect(layers, rect)).toEqual([{ layerId: "layer-1", pathId: path.id }]);
  });

  it("excludes a path with no pin inside the rect", () => {
    const path: PinPath = { ...createPinPath({ type: "line", start: { x: 0, y: 0 }, end: { x: 0, y: 0 } }, 1, STYLE), pins: [pin("p1", 100, 100)] };
    const layers = [layerWithPath("layer-1", path)];
    expect(pinPathsTouchingRect(layers, { x0: 0, y0: 0, x1: 10, y1: 10 })).toEqual([]);
  });

  it("includes a path via a symmetry-mirrored pin even when no real pin is inside the rect", () => {
    const path: PinPath = {
      ...createPinPath({ type: "line", start: { x: 0, y: 0 }, end: { x: 0, y: 0 } }, 1, STYLE),
      pins: [pin("p1", 5, 0)],
      symmetry: { type: "vertical", axis: { x: 0, y: 0 } },
    };
    const layers = [layerWithPath("layer-1", path)];
    // the real pin is at (5,0); its vertical mirror lands at (-5,0)
    const rect: Rect = { x0: -6, y0: -1, x1: -4, y1: 1 };
    expect(pinPathsTouchingRect(layers, rect)).toEqual([{ layerId: "layer-1", pathId: path.id }]);
  });
});

describe("pinsTouchingRect", () => {
  it("returns only real, stored pins inside the rect", () => {
    const path: PinPath = { ...createPinPath({ type: "line", start: { x: 0, y: 0 }, end: { x: 0, y: 0 } }, 1, STYLE), pins: [pin("p1", 1, 1), pin("p2", 100, 100)] };
    const layers = [layerWithPath("layer-1", path)];
    const hits = pinsTouchingRect(layers, { x0: 0, y0: 0, x1: 5, y1: 5 });
    expect(hits).toEqual([{ layerId: "layer-1", pathId: path.id, pinId: "p1" }]);
  });

  it("excludes symmetry-mirrored pins even if they fall inside the rect", () => {
    const path: PinPath = {
      ...createPinPath({ type: "line", start: { x: 0, y: 0 }, end: { x: 0, y: 0 } }, 1, STYLE),
      pins: [pin("p1", 5, 0)],
      symmetry: { type: "vertical", axis: { x: 0, y: 0 } },
    };
    const layers = [layerWithPath("layer-1", path)];
    const rect: Rect = { x0: -6, y0: -1, x1: -4, y1: 1 };
    expect(pinsTouchingRect(layers, rect)).toEqual([]);
  });

  it("returns an empty array when nothing is touched", () => {
    const path: PinPath = { ...createPinPath({ type: "line", start: { x: 0, y: 0 }, end: { x: 0, y: 0 } }, 1, STYLE), pins: [pin("p1", 100, 100)] };
    const layers = [layerWithPath("layer-1", path)];
    expect(pinsTouchingRect(layers, { x0: 0, y0: 0, x1: 1, y1: 1 })).toEqual([]);
  });
});
