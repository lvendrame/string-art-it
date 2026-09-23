import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EditorStore } from "@application/document";
import { loadAutosave, saveAutosave } from "@infrastructure/persistence/autosave";
import { useAutosave } from "./useAutosave";

describe("useAutosave", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
  });

  it("debounces: a burst of mutations only persists once after the quiet period", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    renderHook(() => useAutosave(store));

    act(() => {
      store.addPinPath(layerId, { type: "circle", center: { x: 0, y: 0 }, radius: 5 });
      store.addPinPath(layerId, { type: "circle", center: { x: 0, y: 0 }, radius: 6 });
      store.addPinPath(layerId, { type: "circle", center: { x: 0, y: 0 }, radius: 7 });
    });

    expect(loadAutosave()).toBeNull(); // not yet — still within the debounce window

    act(() => vi.advanceTimersByTime(2100));

    const saved = loadAutosave();
    expect(saved?.pinLayers[0].pinPaths).toHaveLength(3); // one save, with all 3 mutations
  });

  it("offers a pending autosave found at mount time", () => {
    const seed = new EditorStore();
    seed.addPinPath(seed.getState().pinLayers[0].id, { type: "circle", center: { x: 0, y: 0 }, radius: 5 });
    saveAutosave(seed.toProjectFile());

    const store = new EditorStore();
    const { result } = renderHook(() => useAutosave(store));

    expect(result.current.pendingAutosave?.pinLayers[0].pinPaths).toHaveLength(1);
  });

  it("restore loads the pending autosave into the store and clears it", () => {
    const seed = new EditorStore();
    seed.addPinPath(seed.getState().pinLayers[0].id, { type: "circle", center: { x: 0, y: 0 }, radius: 5 });
    saveAutosave(seed.toProjectFile());

    const store = new EditorStore();
    const { result } = renderHook(() => useAutosave(store));

    act(() => result.current.restore());

    expect(store.getState().pinLayers[0].pinPaths).toHaveLength(1);
    expect(result.current.pendingAutosave).toBeNull();
  });

  it("restore is a no-op when there is no pending autosave", () => {
    const store = new EditorStore();
    const { result } = renderHook(() => useAutosave(store));

    expect(result.current.pendingAutosave).toBeNull();
    act(() => result.current.restore());

    expect(result.current.pendingAutosave).toBeNull();
  });

  it("discard clears the stored autosave and the pending offer", () => {
    const seed = new EditorStore();
    seed.addPinPath(seed.getState().pinLayers[0].id, { type: "circle", center: { x: 0, y: 0 }, radius: 5 });
    saveAutosave(seed.toProjectFile());

    const store = new EditorStore();
    const { result } = renderHook(() => useAutosave(store));

    act(() => result.current.discard());

    expect(result.current.pendingAutosave).toBeNull();
    expect(loadAutosave()).toBeNull();
  });
});
