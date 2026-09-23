import { describe, expect, it } from "vitest";
import { EditorStore } from "@application/document";
import { buildPinGroups, selectedPinsFromGroups } from "./pinGroups";

function setup() {
  const store = new EditorStore();
  const layerId = store.getState().pinLayers[0].id;
  const pathId = store.addPinPath(layerId, { type: "line", start: { x: 10, y: 10 }, end: { x: 30, y: 10 } })!;
  const pins = store.getState().pinLayers[0].pinPaths[0].pins;
  return { store, layerId, pathId, pins };
}

describe("buildPinGroups", () => {
  it("groups multiple selected pins on the same path into one group", () => {
    const { store, layerId, pathId, pins } = setup();
    const groups = buildPinGroups(store.getState().pinLayers, [
      { layerId, pathId, pinId: pins[0].id },
      { layerId, pathId, pinId: pins[1].id },
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].selectedIds.size).toBe(2);
    expect(groups[0].selectedIds.has(pins[0].id)).toBe(true);
    expect(groups[0].selectedIds.has(pins[1].id)).toBe(true);
  });

  it("skips refs pointing at a path that doesn't exist", () => {
    const { store, layerId } = setup();
    const groups = buildPinGroups(store.getState().pinLayers, [{ layerId, pathId: "missing-path", pinId: "missing-pin" }]);
    expect(groups).toEqual([]);
  });

  it("splits refs across different paths into separate groups", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    const pathIdA = store.addPinPath(layerId, { type: "line", start: { x: 10, y: 10 }, end: { x: 30, y: 10 } })!;
    const pathIdB = store.addPinPath(layerId, { type: "line", start: { x: 10, y: 20 }, end: { x: 30, y: 20 } })!;
    const pinsA = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathIdA)!.pins;
    const pinsB = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathIdB)!.pins;

    const groups = buildPinGroups(store.getState().pinLayers, [
      { layerId, pathId: pathIdA, pinId: pinsA[0].id },
      { layerId, pathId: pathIdB, pinId: pinsB[0].id },
    ]);

    expect(groups).toHaveLength(2);
    expect(groups.map((g) => g.pathId).sort()).toEqual([pathIdA, pathIdB].sort());
  });
});

describe("selectedPinsFromGroups", () => {
  it("flattens only the selected pins' original {x,y} across every group", () => {
    const { store, layerId, pathId, pins } = setup();
    const groups = buildPinGroups(store.getState().pinLayers, [{ layerId, pathId, pinId: pins[0].id }]);

    const selected = selectedPinsFromGroups(groups);

    expect(selected).toEqual([pins[0]]);
  });
});
