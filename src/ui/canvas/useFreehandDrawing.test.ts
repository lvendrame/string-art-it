import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EditorStore } from "@application/document";
import { useFreehandDrawing } from "./useFreehandDrawing";

function setup() {
  const store = new EditorStore();
  const layerId = store.getState().pinLayers[0].id;
  const { result } = renderHook(() => useFreehandDrawing(store, layerId));
  const viewport = store.getState().viewport;
  return { store, layerId, result, viewport };
}

describe("useFreehandDrawing", () => {
  it("mouse move before mouse down is a no-op", () => {
    const { result, viewport } = setup();

    act(() => result.current.handleMouseMove({ x: 5, y: 5 }, viewport));

    expect(result.current.points).toEqual([]);
    expect(result.current.isDrawing).toBe(false);
  });

  it("a move smaller than the minimum sample distance is dropped", () => {
    const { result, viewport } = setup();

    act(() => result.current.handleMouseDown({ x: 0, y: 0 }));
    act(() => result.current.handleMouseMove({ x: 0.001, y: 0.001 }, viewport));

    expect(result.current.points).toEqual([{ x: 0, y: 0 }]);
  });

  it("captures points once they exceed the minimum sample distance, and commits on mouse up", () => {
    const { store, result, viewport } = setup();

    act(() => result.current.handleMouseDown({ x: 0, y: 0 }));
    act(() => result.current.handleMouseMove({ x: 10, y: 0 }, viewport));
    expect(result.current.points).toEqual([{ x: 0, y: 0 }, { x: 10, y: 0 }]);
    expect(result.current.isDrawing).toBe(true);

    act(() => result.current.handleMouseUp());

    expect(result.current.points).toEqual([]);
    expect(store.getState().pinLayers[0].pinPaths[0].geometry).toMatchObject({ type: "freehand" });
  });

  it("mouse up with fewer than 2 points does not commit a path", () => {
    const { store, result } = setup();

    act(() => result.current.handleMouseDown({ x: 0, y: 0 }));
    act(() => result.current.handleMouseUp());

    expect(store.getState().pinLayers[0].pinPaths).toHaveLength(0);
  });
});
