import { describe, expect, it } from "vitest";
import { EditorStore } from "./EditorStore";

describe("EditorStore symmetry", () => {
  it("with no selection, sets the default symmetry for new Pin Paths", () => {
    const store = new EditorStore();
    store.setSymmetryConfig({ type: "radial", centre: { x: 0, y: 0 }, intervalDegrees: 60 });

    const layerId = store.getState().pinLayers[0].id;
    store.addPinPath(layerId, { type: "circle", center: { x: 0, y: 0 }, radius: 5 });

    expect(store.getState().pinLayers[0].pinPaths[0].symmetry).toEqual({
      type: "radial",
      centre: { x: 0, y: 0 },
      intervalDegrees: 60,
    });
  });

  it("with a Pin Path selected, changes only that path's symmetry and is undoable", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    const pathId = store.addPinPath(layerId, { type: "circle", center: { x: 0, y: 0 }, radius: 5 })!;
    store.select({ type: "pinPath", layerId, pathId });

    store.setSymmetryConfig({ type: "vertical", axis: { x: 0, y: 0 } });
    expect(store.getState().pinLayers[0].pinPaths[0].symmetry).toEqual({ type: "vertical", axis: { x: 0, y: 0 } });

    store.undo();
    expect(store.getState().pinLayers[0].pinPaths[0].symmetry).toEqual({ type: "none" });
  });

  it("deleting a source Pin Path removes it (and its derived mirrors) in one undo step", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    const pathId = store.addPinPath(layerId, { type: "circle", center: { x: 0, y: 0 }, radius: 5 })!;
    store.select({ type: "pinPath", layerId, pathId });
    store.setSymmetryConfig({ type: "radial", centre: { x: 0, y: 0 }, intervalDegrees: 90 });

    store.deletePinPath(layerId, pathId);
    expect(store.getState().pinLayers[0].pinPaths).toHaveLength(0);

    store.undo();
    expect(store.getState().pinLayers[0].pinPaths).toHaveLength(1);
    expect(store.getState().pinLayers[0].pinPaths[0].symmetry.type).toBe("radial");
  });
});
