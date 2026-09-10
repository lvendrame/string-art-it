import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EditorStore } from "../application/document";
import { loadAutosave, saveAutosave } from "../infrastructure/persistence/autosave";
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
});
