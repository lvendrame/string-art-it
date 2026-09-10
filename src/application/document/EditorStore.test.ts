import { describe, expect, it } from "vitest";
import { EditorStore } from "./EditorStore";

describe("EditorStore board mutations (undoable)", () => {
  it("changing a dimension is undoable", () => {
    const store = new EditorStore();
    const before = store.getState().board.dimensions.diameter;

    store.setBoardDimensions({ diameter: 50 });
    expect(store.getState().board.dimensions.diameter).toBe(50);

    store.undo();
    expect(store.getState().board.dimensions.diameter).toBe(before);
  });

  it("switching shape resets dimensions to that shape's defaults", () => {
    const store = new EditorStore();
    store.setBoardShape("rectangle");
    expect(store.getState().board.dimensions).toEqual({ width: 60, height: 40 });
  });

  it("switching triangle type clears the other type's fields", () => {
    const store = new EditorStore();
    store.setTriangleType("right-angled");
    store.setBoardDimensions({ base: 40, height: 30 });
    expect(store.getState().board.dimensions).toEqual({ base: 40, height: 30 });

    store.setTriangleType("equilateral");
    expect(store.getState().board.dimensions).toEqual({ side: 50 });
  });

  it("notifies subscribers on change", () => {
    const store = new EditorStore();
    let calls = 0;
    const unsubscribe = store.subscribe(() => { calls += 1; });

    store.setBoardDimensions({ diameter: 80 });
    expect(calls).toBe(1);

    unsubscribe();
    store.setBoardDimensions({ diameter: 90 });
    expect(calls).toBe(1);
  });
});

describe("EditorStore transient state (not undoable)", () => {
  it("mode changes are not recorded in history", () => {
    const store = new EditorStore();
    store.setMode("thread");
    expect(store.getState().mode).toBe("thread");
    expect(store.canUndo()).toBe(false);
  });

  it("grid visibility and snap-to-grid toggle independently", () => {
    const store = new EditorStore();
    store.setGrid({ visible: false });
    expect(store.getState().grid.visible).toBe(false);
    expect(store.getState().grid.snapEnabled).toBe(true);
  });

  it("viewport changes never touch board dimensions", () => {
    const store = new EditorStore();
    const before = store.getState().board;
    store.setViewport({ zoom: 8, panOrigin: { x: 0, y: 0 } });
    expect(store.getState().board).toBe(before);
  });
});
