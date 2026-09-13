import { describe, expect, it } from "vitest";
import { EditorStore } from "./EditorStore";
import { recomputePinPath, scaleGeometry } from "./pinPath";

describe("EditorStore — Edit mode: Scale", () => {
  it("commitPinPathScale recomputes pins, is undoable as one step, and reattaches a connected thread to the nearest new pin", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    const pathId = store.addPinPath(layerId, { type: "circle", center: { x: 0, y: 0 }, radius: 4 })!;
    const originalPath = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathId)!;
    const threadLayerId = store.getState().threadLayers[0].id;
    store.extendThreadDraft(originalPath.pins[0].id);
    store.finishThreadDraftWithSegment(threadLayerId, originalPath.pins[1].id);

    const snapshot = { pinLayers: store.getState().pinLayers, threadLayers: store.getState().threadLayers };
    const scaledGeometry = scaleGeometry(originalPath.geometry, 2);
    const newPinPath = recomputePinPath({ ...originalPath, geometry: scaledGeometry });

    store.commitPinPathScale(layerId, pathId, newPinPath, snapshot);

    const scaled = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathId)!;
    expect(scaled.geometry).toEqual(scaledGeometry);
    // Fresh pin ids minted (unlike Move/Rotation) since the count itself can change.
    expect(scaled.pins.map((p) => p.id)).not.toEqual(originalPath.pins.map((p) => p.id));

    // The thread that referenced the two original pins now references two pins that
    // still exist on the scaled path (reattached to the nearest new pin).
    const thread = store.getState().threadLayers[0].threadPaths[0];
    expect(thread.pinIds.every((id) => scaled.pins.some((p) => p.id === id))).toBe(true);

    store.undo();
    expect(store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathId)!).toEqual(originalPath);
    expect(store.getState().threadLayers[0].threadPaths[0].pinIds).toEqual([originalPath.pins[0].id, originalPath.pins[1].id]);
  });

  it("commitPinPathScale refuses to commit on a locked layer, restoring the snapshot", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    const pathId = store.addPinPath(layerId, { type: "circle", center: { x: 0, y: 0 }, radius: 4 })!;
    const originalPath = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathId)!;
    const snapshot = { pinLayers: store.getState().pinLayers, threadLayers: store.getState().threadLayers };
    store.togglePinLayerLocked(layerId);

    const newPinPath = recomputePinPath({ ...originalPath, geometry: scaleGeometry(originalPath.geometry, 3) });
    store.commitPinPathScale(layerId, pathId, newPinPath, snapshot);

    expect(store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathId)!).toEqual(originalPath);
  });
});

describe("EditorStore — Pin distance (setPinProperty spacing)", () => {
  it("changing spacing on a selected Pin Path recomputes pins and reattaches a connected thread, as one undo step", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    const pathId = store.addPinPath(layerId, { type: "circle", center: { x: 0, y: 0 }, radius: 4 })!;
    const originalPath = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathId)!;
    const threadLayerId = store.getState().threadLayers[0].id;
    store.extendThreadDraft(originalPath.pins[0].id);
    store.finishThreadDraftWithSegment(threadLayerId, originalPath.pins[1].id);

    store.select({ type: "pinPath", layerId, pathId });
    store.setPinProperty({ spacing: originalPath.requestedSpacing / 2 });

    const respaced = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathId)!;
    expect(respaced.requestedSpacing).toBeCloseTo(originalPath.requestedSpacing / 2, 6);
    expect(respaced.pins.map((p) => p.id)).not.toEqual(originalPath.pins.map((p) => p.id));

    const thread = store.getState().threadLayers[0].threadPaths[0];
    expect(thread.pinIds.every((id) => respaced.pins.some((p) => p.id === id))).toBe(true);

    store.undo();
    expect(store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathId)!).toEqual(originalPath);
    expect(store.getState().threadLayers[0].threadPaths[0].pinIds).toEqual([originalPath.pins[0].id, originalPath.pins[1].id]);
  });

  it("changing spacing on a locked layer's selected Pin Path is a no-op", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    const pathId = store.addPinPath(layerId, { type: "circle", center: { x: 0, y: 0 }, radius: 4 })!;
    const originalPath = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathId)!;
    store.select({ type: "pinPath", layerId, pathId });
    store.togglePinLayerLocked(layerId);

    store.setPinProperty({ spacing: originalPath.requestedSpacing / 2 });

    expect(store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathId)!).toEqual(originalPath);
  });

  it("non-spacing property changes (colour) still commit without touching pins or threads", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    const pathId = store.addPinPath(layerId, { type: "circle", center: { x: 0, y: 0 }, radius: 4 })!;
    const originalPath = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathId)!;
    store.select({ type: "pinPath", layerId, pathId });

    store.setPinProperty({ colour: "#ff0000" });

    const updated = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathId)!;
    expect(updated.colour).toBe("#ff0000");
    expect(updated.pins).toEqual(originalPath.pins);
  });
});
