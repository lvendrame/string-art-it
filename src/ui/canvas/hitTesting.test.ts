import { describe, expect, it } from "vitest";
import {
  nearestSelectPathHit,
  nearestSelectPinHit,
  nearestThreadInsertionPin,
  pinPathsTouchingRect,
  pinsTouchingRect,
  selectablePinPathsTouchingRect,
  selectablePinsTouchingRect,
  type Rect,
} from "./hitTesting";
import { createPinPath, type Pin, type PinLayer, type PinPath } from "@application/document";

const STYLE = { colour: "#fff", diameter: 2, guideVisible: true };

function pin(id: string, x: number, y: number): Pin {
  return { id, x, y };
}

function layerWithPath(layerId: string, path: PinPath, visible = true): PinLayer {
  return { id: layerId, name: layerId, visible, locked: false, pinPaths: [path] };
}

function pathWithPins(...pins: Pin[]): PinPath {
  return { ...createPinPath({ type: "line", start: { x: 0, y: 0 }, end: { x: 0, y: 0 } }, 1, STYLE), pins };
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

describe("nearestThreadInsertionPin", () => {
  it("ignores pins on a hidden Pin Layer even when geometrically closest", () => {
    const hidden = layerWithPath("detail", pathWithPins(pin("p9", 0, 0)), false);
    const visible = layerWithPath("base", pathWithPins(pin("p14", 3, 0)));
    const hit = nearestThreadInsertionPin([hidden, visible], "base", { x: 0, y: 0 }, 10);
    expect(hit).toEqual({ layerId: "base", pathId: visible.pinPaths[0].id, pinId: "p14" });
  });

  it("prioritizes the active Pin Layer's pin over a closer pin on another visible layer", () => {
    const active = layerWithPath("base", pathWithPins(pin("p3", 5, 0)));
    const other = layerWithPath("overlay", pathWithPins(pin("p7", 1, 0)));
    const hit = nearestThreadInsertionPin([other, active], "base", { x: 0, y: 0 }, 10);
    expect(hit).toEqual({ layerId: "base", pathId: active.pinPaths[0].id, pinId: "p3" });
  });

  it("falls back to another visible layer when the active layer has no candidate in range", () => {
    const active = layerWithPath("base", pathWithPins(pin("p3", 100, 0)));
    const other = layerWithPath("overlay", pathWithPins(pin("p7", 1, 0)));
    const hit = nearestThreadInsertionPin([active, other], "base", { x: 0, y: 0 }, 10);
    expect(hit).toEqual({ layerId: "overlay", pathId: other.pinPaths[0].id, pinId: "p7" });
  });

  it("returns null when no visible layer has a pin within range", () => {
    const hidden = layerWithPath("detail", pathWithPins(pin("p9", 0, 0)), false);
    const hit = nearestThreadInsertionPin([hidden], "base", { x: 0, y: 0 }, 10);
    expect(hit).toBeNull();
  });

  it("still resolves symmetry-mirrored pins to their source path", () => {
    const path: PinPath = { ...pathWithPins(pin("p1", 5, 0)), symmetry: { type: "vertical", axis: { x: 0, y: 0 } } };
    const layer = layerWithPath("base", path);
    // the real pin is at (5,0); its vertical mirror lands at (-5,0)
    const hit = nearestThreadInsertionPin([layer], "base", { x: -5, y: 0 }, 1);
    expect(hit).toEqual({ layerId: "base", pathId: path.id, pinId: "p1~mirror-0" });
  });
});

describe("nearestSelectPathHit / nearestSelectPinHit", () => {
  it("nearestSelectPathHit ignores a hidden layer even when geometrically closest", () => {
    const hidden = layerWithPath("detail", pathWithPins(pin("p9", 0, 0)), false);
    const visible = layerWithPath("base", pathWithPins(pin("p14", 3, 0)));
    const hit = nearestSelectPathHit([hidden, visible], "base", { x: 0, y: 0 }, 10);
    expect(hit).toEqual({ layerId: "base", pathId: visible.pinPaths[0].id, pinId: "p14" });
  });

  it("nearestSelectPathHit prioritizes the active layer over a closer pin on another visible layer", () => {
    const active = layerWithPath("base", pathWithPins(pin("p3", 5, 0)));
    const other = layerWithPath("overlay", pathWithPins(pin("p7", 1, 0)));
    const hit = nearestSelectPathHit([other, active], "base", { x: 0, y: 0 }, 10);
    expect(hit).toEqual({ layerId: "base", pathId: active.pinPaths[0].id, pinId: "p3" });
  });

  it("nearestSelectPathHit falls back to another visible layer when the active layer has no candidate", () => {
    const active = layerWithPath("base", pathWithPins(pin("p3", 100, 0)));
    const other = layerWithPath("overlay", pathWithPins(pin("p7", 1, 0)));
    const hit = nearestSelectPathHit([active, other], "base", { x: 0, y: 0 }, 10);
    expect(hit).toEqual({ layerId: "overlay", pathId: other.pinPaths[0].id, pinId: "p7" });
  });

  it("nearestSelectPinHit ignores a hidden layer's pin even when geometrically closest", () => {
    const hidden = layerWithPath("detail", pathWithPins(pin("p9", 0, 0)), false);
    const visible = layerWithPath("base", pathWithPins(pin("p14", 3, 0)));
    const hit = nearestSelectPinHit([hidden, visible], "base", { x: 0, y: 0 }, 10);
    expect(hit).toEqual({ layerId: "base", pathId: visible.pinPaths[0].id, pinId: "p14" });
  });

  it("nearestSelectPinHit prioritizes the active layer's pin over a closer pin on another visible layer", () => {
    const active = layerWithPath("base", pathWithPins(pin("p3", 5, 0)));
    const other = layerWithPath("overlay", pathWithPins(pin("p7", 1, 0)));
    const hit = nearestSelectPinHit([other, active], "base", { x: 0, y: 0 }, 10);
    expect(hit).toEqual({ layerId: "base", pathId: active.pinPaths[0].id, pinId: "p3" });
  });

  it("nearestSelectPinHit excludes symmetry-mirrored pins, unlike nearestSelectPathHit", () => {
    const path: PinPath = { ...pathWithPins(pin("p1", 5, 0)), symmetry: { type: "vertical", axis: { x: 0, y: 0 } } };
    const layer = layerWithPath("base", path);
    // the real pin is at (5,0); its vertical mirror lands at (-5,0)
    expect(nearestSelectPathHit([layer], "base", { x: -5, y: 0 }, 1)).toEqual({ layerId: "base", pathId: path.id, pinId: "p1~mirror-0" });
    expect(nearestSelectPinHit([layer], "base", { x: -5, y: 0 }, 1)).toBeNull();
  });
});

describe("selectablePinPathsTouchingRect / selectablePinsTouchingRect", () => {
  it("selectablePinPathsTouchingRect only returns the active layer's touched paths when it has any", () => {
    const active = layerWithPath("base", pathWithPins(pin("p1", 1, 1)));
    const other = layerWithPath("overlay", pathWithPins(pin("p2", 2, 2)));
    const touched = selectablePinPathsTouchingRect([active, other], "base", { x0: 0, y0: 0, x1: 5, y1: 5 });
    expect(touched).toEqual([{ layerId: "base", pathId: active.pinPaths[0].id }]);
  });

  it("selectablePinPathsTouchingRect falls back to other visible layers when the active layer has nothing touched", () => {
    const active = layerWithPath("base", pathWithPins(pin("p1", 100, 100)));
    const other = layerWithPath("overlay", pathWithPins(pin("p2", 2, 2)));
    const touched = selectablePinPathsTouchingRect([active, other], "base", { x0: 0, y0: 0, x1: 5, y1: 5 });
    expect(touched).toEqual([{ layerId: "overlay", pathId: other.pinPaths[0].id }]);
  });

  it("selectablePinPathsTouchingRect never returns a hidden layer's paths, even with no active-layer match", () => {
    const active = layerWithPath("base", pathWithPins(pin("p1", 100, 100)));
    const hidden = layerWithPath("detail", pathWithPins(pin("p2", 2, 2)), false);
    const touched = selectablePinPathsTouchingRect([active, hidden], "base", { x0: 0, y0: 0, x1: 5, y1: 5 });
    expect(touched).toEqual([]);
  });

  it("selectablePinsTouchingRect only returns the active layer's touched pins when it has any", () => {
    const active = layerWithPath("base", pathWithPins(pin("p1", 1, 1)));
    const other = layerWithPath("overlay", pathWithPins(pin("p2", 2, 2)));
    const touched = selectablePinsTouchingRect([active, other], "base", { x0: 0, y0: 0, x1: 5, y1: 5 });
    expect(touched).toEqual([{ layerId: "base", pathId: active.pinPaths[0].id, pinId: "p1" }]);
  });

  it("selectablePinsTouchingRect falls back to other visible layers when the active layer has nothing touched", () => {
    const active = layerWithPath("base", pathWithPins(pin("p1", 100, 100)));
    const other = layerWithPath("overlay", pathWithPins(pin("p2", 2, 2)));
    const touched = selectablePinsTouchingRect([active, other], "base", { x0: 0, y0: 0, x1: 5, y1: 5 });
    expect(touched).toEqual([{ layerId: "overlay", pathId: other.pinPaths[0].id, pinId: "p2" }]);
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
