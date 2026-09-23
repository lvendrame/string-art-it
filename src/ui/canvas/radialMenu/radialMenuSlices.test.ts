import { describe, expect, it } from "vitest";
import { EditorStore } from "@application/document";
import { getRadialMenuSliceIds } from "./radialMenuSlices";

describe("getRadialMenuSliceIds", () => {
  it("Edit mode: base slice set with no mergeable selection", () => {
    const state = new EditorStore({ mode: "select", selectTool: "select", selection: { type: "none" } }).getState();
    expect(getRadialMenuSliceIds(state)).toEqual(["select", "move", "rotate", "scale"]);
  });

  it("Edit mode: Merge slice stays absent below 2 selected paths", () => {
    const state = new EditorStore({
      mode: "select",
      selection: { type: "pinPaths", refs: [{ layerId: "l1", pathId: "p1" }] },
    }).getState();
    expect(getRadialMenuSliceIds(state)).toEqual(["select", "move", "rotate", "scale"]);
  });

  it("Edit mode: Merge slice appears once 2+ Pin Paths are selected", () => {
    const state = new EditorStore({
      mode: "select",
      selection: { type: "pinPaths", refs: [{ layerId: "l1", pathId: "p1" }, { layerId: "l1", pathId: "p2" }] },
    }).getState();
    expect(getRadialMenuSliceIds(state)).toEqual(["select", "move", "rotate", "scale", "merge"]);
  });

  it("Edit mode: Merge slice appears once 2+ pins are selected (Pins granularity)", () => {
    const state = new EditorStore({
      mode: "select",
      selection: { type: "pins", refs: [{ layerId: "l1", pathId: "p1", pinId: "pin-1" }, { layerId: "l1", pathId: "p1", pinId: "pin-2" }] },
    }).getState();
    expect(getRadialMenuSliceIds(state)).toEqual(["select", "move", "rotate", "scale", "merge"]);
  });

  it("Pin mode: the ten basic tools, Polygon/Star family excluded", () => {
    const state = new EditorStore({ mode: "pin", polygonDraft: null }).getState();
    expect(getRadialMenuSliceIds(state)).toEqual([
      "pinLine",
      "pinArc",
      "pinEllipse",
      "pinCircle",
      "pinRectangle",
      "pinSquare",
      "pinFreehand",
      "pinPath",
      "pinEraser",
      "pinPathEraser",
    ]);
  });

  it("Pin mode: Path tool draft slice set entirely replaces the normal set", () => {
    const state = new EditorStore({ mode: "pin", polygonDraft: { points: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }] } }).getState();
    expect(getRadialMenuSliceIds(state)).toEqual(["polygonCut", "polygonBack", "polygonCancel"]);
  });

  it("Thread mode: normal slice set with no draft in progress", () => {
    const state = new EditorStore({ mode: "thread", threadDraft: null }).getState();
    expect(getRadialMenuSliceIds(state)).toEqual(["threadDraw", "threadZigzag", "threadParabolic", "threadEraser", "threadSegment"]);
  });

  it("Thread mode: draft slice set entirely replaces the normal set", () => {
    const state = new EditorStore({ mode: "thread", threadDraft: { pinIds: ["1", "2"] } }).getState();
    expect(getRadialMenuSliceIds(state)).toEqual(["threadCut", "threadBack", "threadNext"]);
  });

  it("Thread mode: Zig-zag/Parabolic draft with no candidates yet shows Back/Cancel only", () => {
    const state = new EditorStore({
      mode: "thread",
      twoPinDraft: { tool: "zigzag", firstPinId: "1", candidates: [], chosenIndex: 0 },
    }).getState();
    expect(getRadialMenuSliceIds(state)).toEqual(["twoPinBack", "twoPinCancel"]);
  });

  it("Thread mode: Zig-zag/Parabolic draft with candidates adds Resolve", () => {
    const state = new EditorStore({
      mode: "thread",
      twoPinDraft: { tool: "zigzag", firstPinId: "1", candidates: [["1", "2"]], chosenIndex: 0 },
    }).getState();
    expect(getRadialMenuSliceIds(state)).toEqual(["twoPinResolve", "twoPinBack", "twoPinCancel"]);
  });

  it("Pan mode", () => {
    const state = new EditorStore({ mode: "pan" }).getState();
    expect(getRadialMenuSliceIds(state)).toEqual(["panFit", "panZoomIn", "panZoomOut"]);
  });

  it("Play mode", () => {
    const state = new EditorStore({ mode: "play" }).getState();
    expect(getRadialMenuSliceIds(state)).toEqual(["playFirst", "playPrevious", "playToggle", "playNext", "playLast"]);
  });

  // docs/specs/32-generator-mode.md — no radial-menu slice set was requested for
  // Generator mode; this asserts the deliberate empty result rather than letting a
  // future refactor silently regress it back to a missing switch case (which would
  // crash RadialContextMenu.tsx's sliceIds.map, since it has no `default`).
  it("Generate mode: no slices", () => {
    const state = new EditorStore({ mode: "generate" }).getState();
    expect(getRadialMenuSliceIds(state)).toEqual([]);
  });
});
