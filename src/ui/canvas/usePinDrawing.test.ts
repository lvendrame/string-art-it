import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EditorStore } from "@application/document";
import { usePinDrawing } from "./usePinDrawing";

function setup() {
  const store = new EditorStore();
  const layerId = store.getState().pinLayers[0].id;
  const { result } = renderHook(() => usePinDrawing(store, layerId));
  return { store, layerId, result };
}

describe("usePinDrawing", () => {
  it("Arc tool: 3 clicks (start, end, curvature) commits an arc pin path", () => {
    const { store, result } = setup();

    act(() => result.current.handleMouseDown({ x: 0, y: 0 }, "arc"));
    act(() => result.current.handleMouseDown({ x: 10, y: 0 }, "arc"));
    act(() => result.current.handleMouseDown({ x: 5, y: 5 }, "arc"));

    expect(store.getState().pinLayers[0].pinPaths[0].geometry).toMatchObject({ type: "arc" });
  });

  it("previewGeometry returns null without a cursor position", () => {
    const { result } = setup();
    expect(result.current.previewGeometry("line", null, false)).toBeNull();
  });

  it("previewGeometry after the arc's 2nd click shows a live curvature preview arc", () => {
    const { result } = setup();
    act(() => result.current.handleMouseDown({ x: 0, y: 0 }, "arc"));
    act(() => result.current.handleMouseDown({ x: 10, y: 0 }, "arc"));

    const preview = result.current.previewGeometry("arc", { x: 5, y: 5 }, false);
    expect(preview).toMatchObject({ type: "arc", start: { x: 0, y: 0 }, end: { x: 10, y: 0 } });
  });

  it("previewGeometry after the arc's 1st click shows a straight guide line", () => {
    const { result } = setup();
    act(() => result.current.handleMouseDown({ x: 0, y: 0 }, "arc"));

    const preview = result.current.previewGeometry("arc", { x: 10, y: 0 }, false);
    expect(preview).toEqual({ type: "line", start: { x: 0, y: 0 }, end: { x: 10, y: 0 } });
  });

  it("previewGeometry returns null for a tool this hook doesn't own (e.g. freehand)", () => {
    const { result } = setup();
    expect(result.current.previewGeometry("freehand", { x: 5, y: 5 }, false)).toBeNull();
  });

  it("mouse up for a non-drag tool with no drag in progress is a no-op", () => {
    const { store, result } = setup();
    act(() => result.current.handleMouseUp({ x: 10, y: 10 }, "arc", false));
    expect(store.getState().pinLayers[0].pinPaths).toHaveLength(0);
  });

  it("Line tool: drag from start to end commits a line pin path", () => {
    const { store, result } = setup();
    act(() => result.current.handleMouseDown({ x: 0, y: 0 }, "line"));
    expect(result.current.previewGeometry("line", { x: 10, y: 0 }, false)).toMatchObject({ type: "line" });

    act(() => result.current.handleMouseUp({ x: 10, y: 0 }, "line", false));

    expect(store.getState().pinLayers[0].pinPaths[0].geometry).toMatchObject({ type: "line" });
  });
});
