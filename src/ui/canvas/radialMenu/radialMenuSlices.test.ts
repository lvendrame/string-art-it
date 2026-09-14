import { describe, expect, it } from "vitest";
import { EditorStore } from "../../../application/document";
import { getRadialMenuSliceIds } from "./radialMenuSlices";

describe("getRadialMenuSliceIds", () => {
  it("Edit mode: base slice set without an active merge", () => {
    const state = new EditorStore({ mode: "select", selectTool: "select" }).getState();
    expect(getRadialMenuSliceIds(state)).toEqual(["select", "move", "rotate", "scale", "merge"]);
  });

  it("Edit mode: Commit Merge stays absent below 2 accumulated pins", () => {
    const state = new EditorStore({
      mode: "select",
      selectTool: "merge",
      mergeSelection: [{ layerId: "l1", pathId: "p1", pinId: "pin-1" }],
    }).getState();
    expect(getRadialMenuSliceIds(state)).toEqual(["select", "move", "rotate", "scale", "merge"]);
  });

  it("Edit mode: Commit Merge appears once 2+ pins are accumulated", () => {
    const state = new EditorStore({
      mode: "select",
      selectTool: "merge",
      mergeSelection: [
        { layerId: "l1", pathId: "p1", pinId: "pin-1" },
        { layerId: "l1", pathId: "p1", pinId: "pin-2" },
      ],
    }).getState();
    expect(getRadialMenuSliceIds(state)).toEqual(["select", "move", "rotate", "scale", "merge", "commitMerge"]);
  });

  it("Pin mode: the nine basic tools, Polygon/Star family excluded", () => {
    const state = new EditorStore({ mode: "pin" }).getState();
    expect(getRadialMenuSliceIds(state)).toEqual([
      "pinLine",
      "pinArc",
      "pinEllipse",
      "pinCircle",
      "pinRectangle",
      "pinSquare",
      "pinFreehand",
      "pinEraser",
      "pinPathEraser",
    ]);
  });

  it("Thread mode: normal slice set with no draft in progress", () => {
    const state = new EditorStore({ mode: "thread", threadDraft: null }).getState();
    expect(getRadialMenuSliceIds(state)).toEqual(["threadDraw", "threadEraser", "threadSegment"]);
  });

  it("Thread mode: draft slice set entirely replaces the normal set", () => {
    const state = new EditorStore({ mode: "thread", threadDraft: { pinIds: ["1", "2"] } }).getState();
    expect(getRadialMenuSliceIds(state)).toEqual(["threadCut", "threadBack", "threadNext"]);
  });

  it("Pan mode", () => {
    const state = new EditorStore({ mode: "pan" }).getState();
    expect(getRadialMenuSliceIds(state)).toEqual(["panFit", "panZoomIn", "panZoomOut"]);
  });

  it("Play mode", () => {
    const state = new EditorStore({ mode: "play" }).getState();
    expect(getRadialMenuSliceIds(state)).toEqual(["playFirst", "playPrevious", "playToggle", "playNext", "playLast"]);
  });
});
