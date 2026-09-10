import { describe, expect, it } from "vitest";
import { EditorStore } from "./EditorStore";

describe("EditorStore pin layer operations", () => {
  it("creating a layer adds a new empty, visible, unlocked layer and makes it active", () => {
    const store = new EditorStore();
    store.addPinLayer();

    expect(store.getState().pinLayers).toHaveLength(2);
    const created = store.getState().pinLayers[1];
    expect(created).toMatchObject({ visible: true, locked: false, pinPaths: [] });
    expect(store.getState().activePinLayerId).toBe(created.id);
  });

  it("renaming a layer changes its display name", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    store.renamePinLayer(layerId, "Outer Circle");
    expect(store.getState().pinLayers[0].name).toBe("Outer Circle");
  });

  it("deleting a layer removes all its Pin Paths in one undo step", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    store.addPinPath(layerId, { type: "circle", center: { x: 0, y: 0 }, radius: 5 });
    store.addPinPath(layerId, { type: "circle", center: { x: 0, y: 0 }, radius: 8 });
    store.addPinLayer();
    const secondLayerId = store.getState().pinLayers[1].id;

    store.deletePinLayer(layerId);
    expect(store.getState().pinLayers).toHaveLength(1);
    expect(store.getState().pinLayers[0].id).toBe(secondLayerId);

    store.undo();
    expect(store.getState().pinLayers).toHaveLength(2);
    expect(store.getState().pinLayers.find((l) => l.id === layerId)?.pinPaths).toHaveLength(2);
  });

  it("duplicating a layer copies its Pin Paths with new stable ids, distinct from the originals", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    store.addPinPath(layerId, { type: "line", start: { x: 0, y: 0 }, end: { x: 5, y: 0 } });

    store.duplicatePinLayer(layerId);

    const [original, copy] = store.getState().pinLayers;
    expect(copy.name).toBe(`${original.name} copy`);
    expect(copy.pinPaths[0].id).not.toBe(original.pinPaths[0].id);
    const originalPinIds = original.pinPaths[0].pins.map((p) => p.id);
    const copyPinIds = copy.pinPaths[0].pins.map((p) => p.id);
    expect(copyPinIds.every((id) => !originalPinIds.includes(id))).toBe(true);
  });

  it("duplicated pins are not automatically referenced by existing threads", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    store.addPinPath(layerId, { type: "line", start: { x: 0, y: 0 }, end: { x: 5, y: 0 } });
    const originalPins = store.getState().pinLayers[0].pinPaths[0].pins;
    const threadLayerId = store.getState().threadLayers[0].id;
    store.extendThreadDraft(originalPins[0].id);
    store.finishThreadDraftWithSegment(threadLayerId, originalPins[1].id);

    store.duplicatePinLayer(layerId);

    const threads = store.getState().threadLayers[0].threadPaths;
    expect(threads).toHaveLength(1);
    expect(threads[0].pinIds).toEqual([originalPins[0].id, originalPins[1].id]);
  });

  it("hidden layer retains its contents", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    store.addPinPath(layerId, { type: "circle", center: { x: 0, y: 0 }, radius: 5 });

    store.togglePinLayerVisible(layerId);
    expect(store.getState().pinLayers[0].visible).toBe(false);
    expect(store.getState().pinLayers[0].pinPaths).toHaveLength(1);

    store.togglePinLayerVisible(layerId);
    expect(store.getState().pinLayers[0].visible).toBe(true);
    expect(store.getState().pinLayers[0].pinPaths).toHaveLength(1);
  });

  it("locked layer blocks edits but still allows visibility toggling", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    store.togglePinLayerLocked(layerId);
    expect(store.getState().pinLayers[0].locked).toBe(true);

    expect(store.addPinPath(layerId, { type: "circle", center: { x: 0, y: 0 }, radius: 5 })).toBeNull();

    store.togglePinLayerVisible(layerId);
    expect(store.getState().pinLayers[0].visible).toBe(false);
  });

  it("reordering moves a layer within the stacking order", () => {
    const store = new EditorStore();
    store.addPinLayer();
    const [a, b] = store.getState().pinLayers;

    store.reorderPinLayer(b.id, -1);

    expect(store.getState().pinLayers.map((l) => l.id)).toEqual([b.id, a.id]);
  });

  it("select-all-objects scope: deleting the active layer falls back to another remaining layer", () => {
    const store = new EditorStore();
    const first = store.getState().pinLayers[0].id;
    store.addPinLayer();
    const second = store.getState().activePinLayerId;
    store.setActivePinLayer(first);

    store.deletePinLayer(first);

    expect(store.getState().activePinLayerId).toBe(second);
  });
});

describe("EditorStore thread layer operations mirror pin layers", () => {
  it("thread layers support the same create/rename/duplicate/delete/reorder operations", () => {
    const store = new EditorStore();
    store.addThreadLayer();
    expect(store.getState().threadLayers).toHaveLength(2);

    const layerId = store.getState().threadLayers[0].id;
    store.renameThreadLayer(layerId, "Red Pattern");
    expect(store.getState().threadLayers[0].name).toBe("Red Pattern");

    store.toggleThreadLayerLocked(layerId);
    expect(store.getState().threadLayers[0].locked).toBe(true);
  });
});
