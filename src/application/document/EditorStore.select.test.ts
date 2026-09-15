import { describe, expect, it } from "vitest";
import { EditorStore } from "./EditorStore";

describe("EditorStore — Edit mode: Move / Rotation", () => {
  it("commitPinPathTransform is undoable, restores the exact original geometry+pins, and keeps pin ids stable", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    const pathId = store.addPinPath(layerId, { type: "line", start: { x: 0, y: 0 }, end: { x: 10, y: 0 } })!;
    const originalPath = store.getState().pinLayers[0].pinPaths[0];
    const snapshot = store.getState().pinLayers;
    const translatedPins = originalPath.pins.map((p) => ({ ...p, x: p.x + 5, y: p.y + 5 }));

    store.commitPinPathTransform(layerId, pathId, { type: "line", start: { x: 5, y: 5 }, end: { x: 15, y: 5 } }, translatedPins, snapshot);
    const moved = store.getState().pinLayers[0].pinPaths[0];
    expect(moved.geometry).toEqual({ type: "line", start: { x: 5, y: 5 }, end: { x: 15, y: 5 } });
    // Same ids as before — a Thread Path referencing them must not orphan.
    expect(moved.pins.map((p) => p.id)).toEqual(originalPath.pins.map((p) => p.id));

    store.undo();
    expect(store.getState().pinLayers[0].pinPaths[0]).toEqual(originalPath);
  });

  it("commitPinPathTransform refuses to commit on a locked layer, restoring the snapshot", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    const pathId = store.addPinPath(layerId, { type: "line", start: { x: 0, y: 0 }, end: { x: 10, y: 0 } })!;
    const snapshot = store.getState().pinLayers;
    const translatedPins = store.getState().pinLayers[0].pinPaths[0].pins.map((p) => ({ ...p, x: p.x + 99, y: p.y + 99 }));
    store.togglePinLayerLocked(layerId);

    store.commitPinPathTransform(layerId, pathId, { type: "line", start: { x: 99, y: 99 }, end: { x: 100, y: 99 } }, translatedPins, snapshot);

    expect(store.getState().pinLayers[0].pinPaths[0].geometry).toEqual({ type: "line", start: { x: 0, y: 0 }, end: { x: 10, y: 0 } });
  });

  it("a Thread Path connected to a moved Pin Path stays connected (pin ids survive the commit)", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    const pathId = store.addPinPath(layerId, { type: "line", start: { x: 0, y: 0 }, end: { x: 10, y: 0 } })!;
    const pins = store.getState().pinLayers[0].pinPaths[0].pins;
    const threadLayerId = store.getState().threadLayers[0].id;
    store.extendThreadDraft(pins[0].id);
    store.finishThreadDraftWithSegment(threadLayerId, pins[1].id);

    const snapshot = store.getState().pinLayers;
    const translatedPins = pins.map((p) => ({ ...p, x: p.x + 3, y: p.y + 3 }));
    store.commitPinPathTransform(layerId, pathId, { type: "line", start: { x: 3, y: 3 }, end: { x: 13, y: 3 } }, translatedPins, snapshot);

    const thread = store.getState().threadLayers[0].threadPaths[0];
    expect(thread.pinIds).toEqual([pins[0].id, pins[1].id]);
    const movedPin0 = store.getState().pinLayers[0].pinPaths[0].pins.find((p) => p.id === pins[0].id)!;
    expect(movedPin0.x).toBe(pins[0].x + 3);
  });

  it("previewPinPathPins/restorePinLayers never touch undo history", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    const pathId = store.addPinPath(layerId, { type: "line", start: { x: 0, y: 0 }, end: { x: 10, y: 0 } })!;
    const snapshot = store.getState().pinLayers;

    store.previewPinPathPins(layerId, pathId, [{ id: "x1", x: 50, y: 50 }]);
    expect(store.getState().pinLayers[0].pinPaths[0].pins).toEqual([{ id: "x1", x: 50, y: 50 }]);
    store.restorePinLayers(snapshot);
    expect(store.getState().pinLayers).toEqual(snapshot);

    // One undo() should undo the addPinPath itself — proving neither preview call
    // pushed its own undo step in between.
    store.undo();
    expect(store.getState().pinLayers[0].pinPaths).toHaveLength(0);
  });
});

// Merge tool coverage lives in EditorStore.merge.test.ts (docs/specs/26-edit-mode-
// multi-select.md unified Merge into an instant action over the current selection,
// replacing the old accumulate-click gesture these tests used to cover).
