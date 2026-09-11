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

describe("EditorStore — Edit mode: Merge", () => {
  function seedTwoPaths(store: EditorStore) {
    const layerId = store.getState().pinLayers[0].id;
    const pathIdA = store.addPinPath(layerId, { type: "line", start: { x: 0, y: 0 }, end: { x: 2, y: 0 } })!; // pins at x=0,1,2
    const pathIdB = store.addPinPath(layerId, { type: "line", start: { x: 0, y: 10 }, end: { x: 2, y: 10 } })!; // pins at x=0,1,2 (y=10)
    const pinsA = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathIdA)!.pins;
    const pinsB = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathIdB)!.pins;
    return { layerId, pathIdA, pathIdB, pinsA, pinsB };
  }

  it("merges pins from two Pin Paths into one new pin at their average, in the first-clicked path, cascading into a connecting thread, as one undo step", () => {
    const store = new EditorStore();
    const { layerId, pathIdA, pathIdB, pinsA, pinsB } = seedTwoPaths(store);
    const threadLayerId = store.getState().threadLayers[0].id;

    // Thread pinsA[1] -> pinsA[0] -> pinsB[0]; only the two LAST pins (one from each
    // path) get merged, so the thread contracts to 2 ids instead of collapsing away.
    store.extendThreadDraft(pinsA[1].id);
    store.extendThreadDraft(pinsA[0].id);
    store.finishThreadDraftWithSegment(threadLayerId, pinsB[0].id);

    store.extendMergeSelection({ layerId, pathId: pathIdA, pinId: pinsA[0].id });
    store.extendMergeSelection({ layerId, pathId: pathIdB, pinId: pinsB[0].id });
    store.commitMergeSelection();

    const pathA = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathIdA)!;
    const pathB = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathIdB)!;
    expect(pathA.pins.some((p) => p.id === pinsA[0].id)).toBe(false);
    expect(pathB.pins.some((p) => p.id === pinsB[0].id)).toBe(false);

    const mergedPin = pathA.pins.find((p) => !pinsA.some((orig) => orig.id === p.id));
    expect(mergedPin).toBeDefined();
    expect(mergedPin!.x).toBeCloseTo((pinsA[0].x + pinsB[0].x) / 2, 6);
    expect(mergedPin!.y).toBeCloseTo((pinsA[0].y + pinsB[0].y) / 2, 6);

    // Thread contracts to [pinsA[1], mergedPin] — the two merged ids collapsed together.
    const thread = store.getState().threadLayers[0].threadPaths[0];
    expect(thread.pinIds).toEqual([pinsA[1].id, mergedPin!.id]);

    // Destination path becomes the new Selection.
    expect(store.getState().selection).toEqual({ type: "pinPath", layerId, pathId: pathIdA });
    expect(store.getState().mergeSelection).toEqual([]);

    store.undo();
    const restoredThread = store.getState().threadLayers[0].threadPaths[0];
    expect(restoredThread.pinIds).toEqual([pinsA[1].id, pinsA[0].id, pinsB[0].id]);
    expect(store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathIdA)!.pins.some((p) => p.id === pinsA[0].id)).toBe(true);
    expect(store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathIdB)!.pins.some((p) => p.id === pinsB[0].id)).toBe(true);
  });

  it("aborts the whole merge with no mutation when any candidate's layer is locked", () => {
    const store = new EditorStore();
    const { layerId, pathIdA, pathIdB, pinsA, pinsB } = seedTwoPaths(store);
    store.togglePinLayerLocked(layerId);

    store.extendMergeSelection({ layerId, pathId: pathIdA, pinId: pinsA[0].id });
    store.extendMergeSelection({ layerId, pathId: pathIdB, pinId: pinsB[0].id });
    store.commitMergeSelection();

    expect(store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathIdA)!.pins.some((p) => p.id === pinsA[0].id)).toBe(true);
    expect(store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathIdB)!.pins.some((p) => p.id === pinsB[0].id)).toBe(true);
    // Selection left intact so the user can Esc or deselect the locked one.
    expect(store.getState().mergeSelection).toHaveLength(2);
  });

  it("committing with fewer than 2 candidates just clears the pending selection", () => {
    const store = new EditorStore();
    const { layerId, pathIdA, pinsA } = seedTwoPaths(store);
    store.extendMergeSelection({ layerId, pathId: pathIdA, pinId: pinsA[0].id });
    store.commitMergeSelection();
    expect(store.getState().mergeSelection).toEqual([]);
    expect(store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathIdA)!.pins.some((p) => p.id === pinsA[0].id)).toBe(true);
  });

  it("extendMergeSelection toggles: clicking an already-selected pin again deselects it", () => {
    const store = new EditorStore();
    const { layerId, pathIdA, pinsA } = seedTwoPaths(store);
    const candidate = { layerId, pathId: pathIdA, pinId: pinsA[0].id };
    store.extendMergeSelection(candidate);
    expect(store.getState().mergeSelection).toHaveLength(1);
    store.extendMergeSelection(candidate);
    expect(store.getState().mergeSelection).toEqual([]);
  });

  it("setSelectTool clears a pending merge selection when leaving the merge tool", () => {
    const store = new EditorStore();
    const { layerId, pathIdA, pinsA } = seedTwoPaths(store);
    store.extendMergeSelection({ layerId, pathId: pathIdA, pinId: pinsA[0].id });
    expect(store.getState().mergeSelection).toHaveLength(1);
    store.setSelectTool("move");
    expect(store.getState().mergeSelection).toEqual([]);
  });
});
