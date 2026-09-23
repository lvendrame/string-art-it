import { act, renderHook } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EditorStore } from "@application/document";
import { usePanInteraction } from "./usePanInteraction";

function makeEvent(clientX: number, clientY: number) {
  return { clientX, clientY } as React.MouseEvent<SVGSVGElement>;
}

describe("usePanInteraction", () => {
  it("update before begin is a no-op", () => {
    const store = new EditorStore();
    const before = store.getState().viewport;
    const { result } = renderHook(() => usePanInteraction(store));

    act(() => result.current.update(makeEvent(10, 10), before));

    expect(store.getState().viewport).toBe(before);
    expect(result.current.isPanning).toBe(false);
  });

  it("begin then update pans the viewport by the drag delta", () => {
    const store = new EditorStore();
    const viewport = store.getState().viewport;
    const { result } = renderHook(() => usePanInteraction(store));

    act(() => result.current.begin(makeEvent(100, 100), viewport));
    expect(result.current.isPanning).toBe(true);

    act(() => result.current.update(makeEvent(120, 90), viewport));

    const updated = store.getState().viewport;
    expect(updated.panOrigin.x).toBe(viewport.panOrigin.x - 20 / viewport.zoom);
    expect(updated.panOrigin.y).toBe(viewport.panOrigin.y - -10 / viewport.zoom);
  });

  it("end() stops panning", () => {
    const store = new EditorStore();
    const viewport = store.getState().viewport;
    const { result } = renderHook(() => usePanInteraction(store));

    act(() => result.current.begin(makeEvent(100, 100), viewport));
    act(() => result.current.end());

    expect(result.current.isPanning).toBe(false);
  });

  it("a window mouseup while panning also stops it", () => {
    const store = new EditorStore();
    const viewport = store.getState().viewport;
    const { result } = renderHook(() => usePanInteraction(store));

    act(() => result.current.begin(makeEvent(100, 100), viewport));
    expect(result.current.isPanning).toBe(true);

    act(() => fireEvent.mouseUp(window));

    expect(result.current.isPanning).toBe(false);
  });
});
