import { describe, expect, it } from "vitest";
import { EditorStore } from "./EditorStore";

describe("EditorStore pin path mutations", () => {
  it("adding a pin path is undoable", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;

    store.addPinPath(layerId, { type: "circle", center: { x: 0, y: 0 }, radius: 10 });
    expect(store.getState().pinLayers[0].pinPaths).toHaveLength(1);

    store.undo();
    expect(store.getState().pinLayers[0].pinPaths).toHaveLength(0);
  });

  it("deleting a pin path removes it and clears selection if it was selected", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    const pathId = store.addPinPath(layerId, { type: "circle", center: { x: 0, y: 0 }, radius: 10 })!;
    store.select({ type: "pinPath", layerId, pathId });

    store.deletePinPath(layerId, pathId);

    expect(store.getState().pinLayers[0].pinPaths).toHaveLength(0);
    expect(store.getState().selection).toEqual({ type: "none" });
  });

  it("updating geometry recalculates pins and is undoable", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    const pathId = store.addPinPath(layerId, { type: "circle", center: { x: 0, y: 0 }, radius: 5 })!;
    const before = store.getState().pinLayers[0].pinPaths[0].pins.length;

    store.updatePinPathGeometry(layerId, pathId, { type: "circle", center: { x: 0, y: 0 }, radius: 20 });
    const after = store.getState().pinLayers[0].pinPaths[0].pins.length;
    expect(after).not.toBe(before);

    store.undo();
    expect(store.getState().pinLayers[0].pinPaths[0].pins.length).toBe(before);
  });

  it("setPinProperty with no selection changes defaults for new objects", () => {
    const store = new EditorStore();
    store.setPinProperty({ spacing: 2.5 });
    expect(store.getState().pinDefaults.spacing).toBe(2.5);

    const layerId = store.getState().pinLayers[0].id;
    store.addPinPath(layerId, { type: "line", start: { x: 0, y: 0 }, end: { x: 5, y: 0 } });
    expect(store.getState().pinLayers[0].pinPaths[0].requestedSpacing).toBe(2.5);
  });

  it("setPinProperty with a selection changes only that object", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    const pathA = store.addPinPath(layerId, { type: "line", start: { x: 0, y: 0 }, end: { x: 8, y: 0 } })!;
    const pathB = store.addPinPath(layerId, { type: "line", start: { x: 0, y: 0 }, end: { x: 8, y: 0 } })!;
    store.select({ type: "pinPath", layerId, pathId: pathA });

    store.setPinProperty({ spacing: 2 });

    const paths = store.getState().pinLayers[0].pinPaths;
    expect(paths.find((p) => p.id === pathA)!.requestedSpacing).toBe(2);
    expect(paths.find((p) => p.id === pathB)!.requestedSpacing).toBe(1);
  });

  it("erasing a pin removes it and is undoable", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    const pathId = store.addPinPath(layerId, { type: "line", start: { x: 0, y: 0 }, end: { x: 8, y: 0 } })!;
    const pin = store.getState().pinLayers[0].pinPaths[0].pins[3];

    store.erasePin(layerId, pathId, pin.id);
    expect(store.getState().pinLayers[0].pinPaths[0].pins.find((p) => p.id === pin.id)).toBeUndefined();

    store.undo();
    expect(store.getState().pinLayers[0].pinPaths[0].pins.find((p) => p.id === pin.id)).toBeDefined();
  });

  it("locked layer blocks pin path creation and edits", () => {
    // Full layer-lock UI lands at M6; the guarantee itself is enforced from M3.
    const scratch = new EditorStore();
    const layerId = scratch.getState().pinLayers[0].id;
    const pathId = scratch.addPinPath(layerId, { type: "circle", center: { x: 0, y: 0 }, radius: 5 })!;
    const seededLayers = scratch.getState().pinLayers.map((l) => (l.id === layerId ? { ...l, locked: true } : l));

    const store = new EditorStore({ pinLayers: seededLayers });
    const before = store.getState().pinLayers[0].pinPaths[0];

    store.updatePinPathGeometry(layerId, pathId, { type: "circle", center: { x: 0, y: 0 }, radius: 9 });
    expect(store.getState().pinLayers[0].pinPaths[0]).toEqual(before);

    expect(store.addPinPath(layerId, { type: "circle", center: { x: 0, y: 0 }, radius: 3 })).toBeNull();
  });
});
