import { describe, expect, it } from "vitest";
import { EditorStore } from "./EditorStore";

function seed(store: EditorStore) {
  const layerId = store.getState().pinLayers[0].id;
  const pathIdA = store.addPinPath(layerId, { type: "line", start: { x: 0, y: 0 }, end: { x: 10, y: 0 } })!;
  const pathIdB = store.addPinPath(layerId, { type: "line", start: { x: 0, y: 20 }, end: { x: 10, y: 20 } })!;
  const pinsA = store.getState().pinLayers[0].pinPaths[0].pins;
  const threadLayerId = store.getState().threadLayers[0].id;
  store.extendThreadDraft(pinsA[0].id);
  store.finishThreadDraftWithSegment(threadLayerId, pinsA[1].id);
  const threadPathId = store.getState().threadLayers[0].threadPaths[0].id;
  return { layerId, pathIdA, pathIdB, pinsA, threadLayerId, threadPathId };
}

describe("EditorStore — deleteSelection", () => {
  it("is a no-op with nothing selected", () => {
    const store = new EditorStore();
    seed(store);
    store.select({ type: "none" });
    const before = store.getState();
    store.deleteSelection();
    expect(store.getState().pinLayers).toBe(before.pinLayers);
    expect(store.getState().threadLayers).toBe(before.threadLayers);
  });

  it("deletes every selected Pin Path and cascades into threads, as ONE undo step", () => {
    const store = new EditorStore();
    const { layerId, pathIdA, pathIdB } = seed(store);
    store.select({ type: "pinPaths", refs: [{ layerId, pathId: pathIdA }, { layerId, pathId: pathIdB }] });

    store.deleteSelection();

    expect(store.getState().pinLayers[0].pinPaths).toHaveLength(0);
    expect(store.getState().threadLayers[0].threadPaths).toHaveLength(0);
    expect(store.getState().selection).toEqual({ type: "none" });

    store.undo();
    expect(store.getState().pinLayers[0].pinPaths.map((p) => p.id)).toEqual([pathIdA, pathIdB]);
    expect(store.getState().threadLayers[0].threadPaths).toHaveLength(1);
  });

  it("deletes selected pins only, cascading into threads that referenced them", () => {
    const store = new EditorStore();
    const { layerId, pathIdA, pinsA } = seed(store);
    store.select({ type: "pins", refs: [{ layerId, pathId: pathIdA, pinId: pinsA[0].id }] });

    store.deleteSelection();

    const remaining = store.getState().pinLayers[0].pinPaths[0].pins;
    expect(remaining.map((p) => p.id)).not.toContain(pinsA[0].id);
    expect(remaining).toHaveLength(pinsA.length - 1);
    expect(store.getState().threadLayers[0].threadPaths).toHaveLength(0);
    expect(store.getState().selection).toEqual({ type: "none" });

    store.undo();
    expect(store.getState().pinLayers[0].pinPaths[0].pins).toHaveLength(pinsA.length);
  });

  it("deletes the selected Thread Path and clears the selection", () => {
    const store = new EditorStore();
    const { threadLayerId, threadPathId } = seed(store);
    store.select({ type: "threadPath", layerId: threadLayerId, pathId: threadPathId });

    store.deleteSelection();

    expect(store.getState().threadLayers[0].threadPaths).toHaveLength(0);
    expect(store.getState().selection).toEqual({ type: "none" });
  });

  it("aborts when any involved Pin layer is locked", () => {
    const store = new EditorStore();
    const { layerId, pathIdA } = seed(store);
    store.select({ type: "pinPaths", refs: [{ layerId, pathId: pathIdA }] });
    store.togglePinLayerLocked(layerId);

    store.deleteSelection();

    expect(store.getState().pinLayers[0].pinPaths).toHaveLength(2);
    expect(store.getState().selection.type).toBe("pinPaths");
  });

  it("aborts when the Thread layer is locked", () => {
    const store = new EditorStore();
    const { threadLayerId, threadPathId } = seed(store);
    store.select({ type: "threadPath", layerId: threadLayerId, pathId: threadPathId });
    store.toggleThreadLayerLocked(threadLayerId);

    store.deleteSelection();

    expect(store.getState().threadLayers[0].threadPaths).toHaveLength(1);
    expect(store.getState().selection.type).toBe("threadPath");
  });
});
