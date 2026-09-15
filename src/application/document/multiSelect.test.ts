import { describe, expect, it } from "vitest";
import { combinePinPaths, pinsCentroid, resolveMergeDestinationPath, selectionCentroid } from "./multiSelect";
import { createPinPath, geometryCenter, type Pin, type PinPath } from "./pinPath";
import type { PinLayer } from "./pinLayer";

const STYLE = { colour: "#fff", diameter: 2, guideVisible: true };

function pin(id: string, x: number, y: number): Pin {
  return { id, x, y };
}

describe("selectionCentroid", () => {
  it("returns the exact per-shape centroid formula when exactly one path is selected", () => {
    const path = createPinPath({ type: "rectangle", position: { x: 3, y: 4 }, width: 6, height: 2, rotation: 0 }, 1, STYLE);
    expect(selectionCentroid([path])).toEqual(geometryCenter(path.geometry));
  });

  it("returns the mean of every real pin across every selected path when 2+ are selected", () => {
    const a: PinPath = { ...createPinPath({ type: "line", start: { x: 0, y: 0 }, end: { x: 0, y: 0 } }, 1, STYLE), pins: [pin("p1", 0, 0), pin("p2", 2, 0)] };
    const b: PinPath = { ...createPinPath({ type: "line", start: { x: 0, y: 0 }, end: { x: 0, y: 0 } }, 1, STYLE), pins: [pin("p3", 0, 4), pin("p4", 2, 4)] };
    const centroid = selectionCentroid([a, b]);
    expect(centroid.x).toBeCloseTo(1);
    expect(centroid.y).toBeCloseTo(2);
  });
});

describe("pinsCentroid", () => {
  it("is always the mean of the given pins, any count", () => {
    expect(pinsCentroid([pin("a", 0, 0)])).toEqual({ x: 0, y: 0 });
    const c = pinsCentroid([pin("a", 0, 0), pin("b", 10, 0), pin("c", 5, 6)]);
    expect(c.x).toBeCloseTo(5);
    expect(c.y).toBeCloseTo(2);
  });
});

describe("combinePinPaths", () => {
  it("pools non-colliding pins from every path, each getting a fresh id", () => {
    const a: PinPath = { ...createPinPath({ type: "line", start: { x: 0, y: 0 }, end: { x: 0, y: 0 } }, 1, STYLE), pins: [pin("a1", 0, 0), pin("a2", 1, 0)] };
    const b: PinPath = { ...createPinPath({ type: "line", start: { x: 0, y: 0 }, end: { x: 0, y: 0 } }, 1, STYLE), pins: [pin("b1", 5, 5)] };
    const { pins, remap } = combinePinPaths([a, b]);
    expect(pins).toHaveLength(3);
    // every surviving pin gets a brand new id, distinct from every original id
    for (const p of pins) expect(["a1", "a2", "b1"]).not.toContain(p.id);
    expect(remap.get("a1")).not.toBe("a1");
    expect(remap.get("a2")).not.toBe("a2");
    expect(remap.get("b1")).not.toBe("b1");
    // remap ids are all distinct (no accidental collapsing of non-coincident pins)
    expect(new Set([remap.get("a1"), remap.get("a2"), remap.get("b1")]).size).toBe(3);
  });

  it("collapses pins at (nearly) the same position into one, remapping both old ids to it", () => {
    const a: PinPath = { ...createPinPath({ type: "line", start: { x: 0, y: 0 }, end: { x: 0, y: 0 } }, 1, STYLE), pins: [pin("a1", 3, 3)] };
    const b: PinPath = { ...createPinPath({ type: "line", start: { x: 0, y: 0 }, end: { x: 0, y: 0 } }, 1, STYLE), pins: [pin("b1", 3, 3), pin("b2", 9, 9)] };
    const { pins, remap } = combinePinPaths([a, b]);
    expect(pins).toHaveLength(2); // a1+b1 collapse, b2 survives alone
    expect(remap.get("a1")).toBe(remap.get("b1"));
    expect(remap.get("b2")).not.toBe(remap.get("a1"));
    const collapsed = pins.find((p) => p.id === remap.get("a1"));
    expect(collapsed).toMatchObject({ x: 3, y: 3 });
  });
});

function layerWithPath(layerId: string, path: PinPath): PinLayer {
  return { id: layerId, name: layerId, visible: true, locked: false, pinPaths: [path] };
}

describe("resolveMergeDestinationPath", () => {
  it("picks the path that contributed the most selected pins", () => {
    const pathA: PinPath = { ...createPinPath({ type: "line", start: { x: 0, y: 0 }, end: { x: 0, y: 0 } }, 1, STYLE), id: "pinpath-1", pins: [pin("p1", 0, 0), pin("p2", 1, 0), pin("p3", 2, 0)] };
    const pathB: PinPath = { ...createPinPath({ type: "line", start: { x: 0, y: 0 }, end: { x: 0, y: 0 } }, 1, STYLE), id: "pinpath-2", pins: [pin("q1", 10, 10)] };
    const layers = [layerWithPath("layer-1", pathA), layerWithPath("layer-2", pathB)];
    const refs = [
      { layerId: "layer-1", pathId: "pinpath-1", pinId: "p1" },
      { layerId: "layer-1", pathId: "pinpath-1", pinId: "p2" },
      { layerId: "layer-2", pathId: "pinpath-2", pinId: "q1" },
    ];
    const dest = resolveMergeDestinationPath(layers, refs, { x: 1, y: 0 });
    expect(dest).toEqual({ layerId: "layer-1", pathId: "pinpath-1" });
  });

  it("breaks a count tie by the tied path's own selected-pins centroid distance to the new pin", () => {
    const pathA: PinPath = { ...createPinPath({ type: "line", start: { x: 0, y: 0 }, end: { x: 0, y: 0 } }, 1, STYLE), id: "pinpath-1", pins: [pin("p1", 0, 0)] };
    const pathB: PinPath = { ...createPinPath({ type: "line", start: { x: 0, y: 0 }, end: { x: 0, y: 0 } }, 1, STYLE), id: "pinpath-2", pins: [pin("q1", 100, 100)] };
    const layers = [layerWithPath("layer-1", pathA), layerWithPath("layer-2", pathB)];
    const refs = [
      { layerId: "layer-1", pathId: "pinpath-1", pinId: "p1" },
      { layerId: "layer-2", pathId: "pinpath-2", pinId: "q1" },
    ];
    // new pin position is right next to pathA's contribution
    const dest = resolveMergeDestinationPath(layers, refs, { x: 1, y: 1 });
    expect(dest).toEqual({ layerId: "layer-1", pathId: "pinpath-1" });
  });

  it("breaks a full tie by the lowest (oldest) numeric Pin Path id", () => {
    const pathA: PinPath = { ...createPinPath({ type: "line", start: { x: 0, y: 0 }, end: { x: 0, y: 0 } }, 1, STYLE), id: "pinpath-10", pins: [pin("p1", 0, 0)] };
    const pathB: PinPath = { ...createPinPath({ type: "line", start: { x: 0, y: 0 }, end: { x: 0, y: 0 } }, 1, STYLE), id: "pinpath-9", pins: [pin("q1", 10, 0)] };
    const layers = [layerWithPath("layer-1", pathA), layerWithPath("layer-2", pathB)];
    const refs = [
      { layerId: "layer-1", pathId: "pinpath-10", pinId: "p1" },
      { layerId: "layer-2", pathId: "pinpath-9", pinId: "q1" },
    ];
    // new pin position equidistant from both (midpoint) -> full tie -> numeric id wins,
    // proving it isn't doing a lexicographic string comparison ("10" < "9" as strings)
    const dest = resolveMergeDestinationPath(layers, refs, { x: 5, y: 0 });
    expect(dest).toEqual({ layerId: "layer-2", pathId: "pinpath-9" });
  });
});
