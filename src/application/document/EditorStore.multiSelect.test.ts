import { describe, expect, it } from "vitest";
import { EditorStore } from "./EditorStore";
import { recomputePinPath, scaleGeometry } from "./pinPath";

describe("EditorStore — setSelectGranularity", () => {
  it("clears the current selection when the granularity switch flips", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    const pathId = store.addPinPath(layerId, { type: "line", start: { x: 0, y: 0 }, end: { x: 10, y: 0 } })!;
    store.select({ type: "pinPaths", refs: [{ layerId, pathId }] });
    expect(store.getState().selectGranularity).toBe("path");

    store.setSelectGranularity("pins");

    expect(store.getState().selectGranularity).toBe("pins");
    expect(store.getState().selection).toEqual({ type: "none" });
  });
});

describe("EditorStore — commitPinPathsTransform (path-mode Move/Rotation over N paths)", () => {
  function seedTwoPaths(store: EditorStore) {
    const layerId = store.getState().pinLayers[0].id;
    const pathIdA = store.addPinPath(layerId, { type: "line", start: { x: 0, y: 0 }, end: { x: 10, y: 0 } })!;
    const pathIdB = store.addPinPath(layerId, { type: "line", start: { x: 0, y: 20 }, end: { x: 10, y: 20 } })!;
    return { layerId, pathIdA, pathIdB };
  }

  it("translates every selected path and commits as ONE undo step", () => {
    const store = new EditorStore();
    const { layerId, pathIdA, pathIdB } = seedTwoPaths(store);
    const snapshot = store.getState().pinLayers;
    const pathA = snapshot.find((l) => l.id === layerId)!.pinPaths.find((p) => p.id === pathIdA)!;
    const pathB = snapshot.find((l) => l.id === layerId)!.pinPaths.find((p) => p.id === pathIdB)!;

    store.commitPinPathsTransform(
      [
        { layerId, pathId: pathIdA, geometry: { type: "line", start: { x: 5, y: 5 }, end: { x: 15, y: 5 } }, pins: pathA.pins.map((p) => ({ ...p, x: p.x + 5, y: p.y + 5 })) },
        { layerId, pathId: pathIdB, geometry: { type: "line", start: { x: 5, y: 25 }, end: { x: 15, y: 25 } }, pins: pathB.pins.map((p) => ({ ...p, x: p.x + 5, y: p.y + 5 })) },
      ],
      snapshot,
    );

    const movedA = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathIdA)!;
    const movedB = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathIdB)!;
    expect(movedA.geometry).toEqual({ type: "line", start: { x: 5, y: 5 }, end: { x: 15, y: 5 } });
    expect(movedB.geometry).toEqual({ type: "line", start: { x: 5, y: 25 }, end: { x: 15, y: 25 } });
    // pin ids stay stable, same as single-path Move
    expect(movedA.pins.map((p) => p.id)).toEqual(pathA.pins.map((p) => p.id));

    store.undo();
    expect(store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathIdA)!).toEqual(pathA);
    expect(store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathIdB)!).toEqual(pathB);
  });

  it("all-or-nothing: a lock on ANY involved path aborts the whole gesture with zero mutation", () => {
    const store = new EditorStore();
    const { layerId, pathIdA, pathIdB } = seedTwoPaths(store);
    const snapshot = store.getState().pinLayers;
    const pathA = snapshot.find((l) => l.id === layerId)!.pinPaths.find((p) => p.id === pathIdA)!;
    const pathB = snapshot.find((l) => l.id === layerId)!.pinPaths.find((p) => p.id === pathIdB)!;
    store.togglePinLayerLocked(layerId); // locks BOTH paths' shared layer

    store.commitPinPathsTransform(
      [
        { layerId, pathId: pathIdA, geometry: { type: "line", start: { x: 99, y: 99 }, end: { x: 100, y: 99 } }, pins: pathA.pins.map((p) => ({ ...p, x: 99 })) },
        { layerId, pathId: pathIdB, geometry: { type: "line", start: { x: 99, y: 99 }, end: { x: 100, y: 99 } }, pins: pathB.pins.map((p) => ({ ...p, x: 99 })) },
      ],
      snapshot,
    );

    expect(store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathIdA)!.geometry).toEqual(pathA.geometry);
    expect(store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathIdB)!.geometry).toEqual(pathB.geometry);
  });
});

describe("EditorStore — commitPinPathsScale (path-mode Scale over N paths)", () => {
  it("recomputes pins per path, reattaches threads, and commits as ONE undo step", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    const pathIdA = store.addPinPath(layerId, { type: "circle", center: { x: 0, y: 0 }, radius: 4 })!;
    const pathIdB = store.addPinPath(layerId, { type: "circle", center: { x: 20, y: 0 }, radius: 4 })!;
    const originalA = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathIdA)!;
    const originalB = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathIdB)!;
    const threadLayerId = store.getState().threadLayers[0].id;
    store.extendThreadDraft(originalA.pins[0].id);
    store.finishThreadDraftWithSegment(threadLayerId, originalA.pins[1].id);

    const previous = { pinLayers: store.getState().pinLayers, threadLayers: store.getState().threadLayers };
    const newA = recomputePinPath({ ...originalA, geometry: scaleGeometry(originalA.geometry, 2) });
    const newB = recomputePinPath({ ...originalB, geometry: scaleGeometry(originalB.geometry, 2) });

    store.commitPinPathsScale(
      [
        { layerId, pathId: pathIdA, newPinPath: newA },
        { layerId, pathId: pathIdB, newPinPath: newB },
      ],
      previous,
    );

    const scaledA = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathIdA)!;
    const scaledB = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathIdB)!;
    expect(scaledA.geometry).toEqual(newA.geometry);
    expect(scaledB.geometry).toEqual(newB.geometry);
    const thread = store.getState().threadLayers[0].threadPaths[0];
    expect(thread.pinIds.every((id) => scaledA.pins.some((p) => p.id === id))).toBe(true);

    store.undo();
    expect(store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathIdA)!).toEqual(originalA);
    expect(store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathIdB)!).toEqual(originalB);
    expect(store.getState().threadLayers[0].threadPaths[0].pinIds).toEqual([originalA.pins[0].id, originalA.pins[1].id]);
  });

  it("all-or-nothing: a lock on any involved path aborts the whole gesture", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    const pathIdA = store.addPinPath(layerId, { type: "circle", center: { x: 0, y: 0 }, radius: 4 })!;
    const originalA = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathIdA)!;
    const previous = { pinLayers: store.getState().pinLayers, threadLayers: store.getState().threadLayers };
    store.togglePinLayerLocked(layerId);
    const newA = recomputePinPath({ ...originalA, geometry: scaleGeometry(originalA.geometry, 3) });

    store.commitPinPathsScale([{ layerId, pathId: pathIdA, newPinPath: newA }], previous);

    expect(store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathIdA)!).toEqual(originalA);
  });
});

describe("EditorStore — commitPinsTransform (pins granularity Move/Rotation/Scale)", () => {
  it("directly moves just the selected pins, leaving the owning path's geometry/spacing untouched", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    const pathId = store.addPinPath(layerId, { type: "line", start: { x: 0, y: 0 }, end: { x: 10, y: 0 } })!;
    const original = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathId)!;
    const snapshot = store.getState().pinLayers;
    const [pinA, pinB] = original.pins;

    store.commitPinsTransform(
      [{ layerId, pathId, pinId: pinA.id, x: 99, y: 99 }],
      snapshot,
    );

    const updated = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathId)!;
    expect(updated.pins.find((p) => p.id === pinA.id)).toMatchObject({ x: 99, y: 99 });
    // every other pin (incl. pinB) is untouched
    expect(updated.pins.find((p) => p.id === pinB.id)).toEqual(original.pins.find((p) => p.id === pinB.id));
    // geometry/spacing/pin-count are all untouched — no recompute (docs/specs/26)
    expect(updated.geometry).toEqual(original.geometry);
    expect(updated.requestedSpacing).toEqual(original.requestedSpacing);
    expect(updated.pins).toHaveLength(original.pins.length);

    store.undo();
    expect(store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathId)!).toEqual(original);
  });

  it("bundles pins spanning multiple paths into ONE undo step", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    const pathIdA = store.addPinPath(layerId, { type: "line", start: { x: 0, y: 0 }, end: { x: 10, y: 0 } })!;
    const pathIdB = store.addPinPath(layerId, { type: "line", start: { x: 0, y: 20 }, end: { x: 10, y: 20 } })!;
    const snapshot = store.getState().pinLayers;
    const pinA = snapshot.find((l) => l.id === layerId)!.pinPaths.find((p) => p.id === pathIdA)!.pins[0];
    const pinB = snapshot.find((l) => l.id === layerId)!.pinPaths.find((p) => p.id === pathIdB)!.pins[0];

    store.commitPinsTransform(
      [
        { layerId, pathId: pathIdA, pinId: pinA.id, x: 50, y: 50 },
        { layerId, pathId: pathIdB, pinId: pinB.id, x: 60, y: 60 },
      ],
      snapshot,
    );

    expect(store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathIdA)!.pins.find((p) => p.id === pinA.id)).toMatchObject({ x: 50, y: 50 });
    expect(store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathIdB)!.pins.find((p) => p.id === pinB.id)).toMatchObject({ x: 60, y: 60 });

    store.undo(); // ONE undo reverts both paths' pin moves together
    expect(store.getState().pinLayers).toEqual(snapshot);
  });

  it("all-or-nothing: a lock on the owning layer aborts the whole gesture", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    const pathId = store.addPinPath(layerId, { type: "line", start: { x: 0, y: 0 }, end: { x: 10, y: 0 } })!;
    const original = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathId)!;
    const snapshot = store.getState().pinLayers;
    store.togglePinLayerLocked(layerId);

    store.commitPinsTransform([{ layerId, pathId, pinId: original.pins[0].id, x: 99, y: 99 }], snapshot);

    expect(store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathId)!).toEqual(original);
  });
});
