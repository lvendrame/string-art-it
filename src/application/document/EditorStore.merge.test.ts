import { describe, expect, it } from "vitest";
import { canCommitSelectionMerge } from "./EditorStore";
import { EditorStore } from "./EditorStore";
import { recomputePinPath, scaleGeometry } from "./pinPath";

describe("EditorStore — commitSelectionMerge, path-mode (Pin Path granularity)", () => {
  function seedTwoPaths(store: EditorStore) {
    const layerId = store.getState().pinLayers[0].id;
    const pathIdA = store.addPinPath(layerId, { type: "line", start: { x: 0, y: 0 }, end: { x: 2, y: 0 } })!; // pins x=0,1,2 y=0
    const pathIdB = store.addPinPath(layerId, { type: "line", start: { x: 0, y: 10 }, end: { x: 2, y: 10 } })!; // pins x=0,1,2 y=10
    return { layerId, pathIdA, pathIdB };
  }

  it("combines two selected Pin Paths into the first-selected path's identity, renumbering every surviving pin", () => {
    const store = new EditorStore();
    const { layerId, pathIdA, pathIdB } = seedTwoPaths(store);
    const originalA = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathIdA)!;
    const originalB = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathIdB)!;
    store.select({ type: "pinPaths", refs: [{ layerId, pathId: pathIdA }, { layerId, pathId: pathIdB }] });

    store.commitSelectionMerge();

    const remaining = store.getState().pinLayers[0].pinPaths;
    expect(remaining).toHaveLength(1); // pathB is gone, everything pooled into pathA's identity
    expect(remaining[0].id).toBe(pathIdA);
    // geometry becomes a freehand thread through every merged pin (NOT pathA's original
    // geometry left as-is) — see the bug this guards against in the "surviving pins
    // after a later Scale" test below.
    expect(remaining[0].geometry.type).toBe("freehand");
    expect(remaining[0].pins).toHaveLength(6); // 3 + 3, none coincide

    // every surviving pin gets a BRAND NEW id (confirmed decision: full renumber)
    const oldIds = new Set([...originalA.pins, ...originalB.pins].map((p) => p.id));
    for (const pin of remaining[0].pins) expect(oldIds.has(pin.id)).toBe(false);

    expect(store.getState().selection).toEqual({ type: "pinPaths", refs: [{ layerId, pathId: pathIdA }] });
  });

  it("collapses coincident pins and reattaches a thread across the whole merged set, as one undo step", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    // A and B share the exact same geometry -> every pin coincides -> full collapse.
    const pathIdA = store.addPinPath(layerId, { type: "line", start: { x: 0, y: 0 }, end: { x: 2, y: 0 } })!;
    const pathIdB = store.addPinPath(layerId, { type: "line", start: { x: 0, y: 0 }, end: { x: 2, y: 0 } })!;
    const originalA = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathIdA)!;
    const originalB = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathIdB)!;
    const threadLayerId = store.getState().threadLayers[0].id;
    store.extendThreadDraft(originalA.pins[0].id);
    store.finishThreadDraftWithSegment(threadLayerId, originalB.pins[1].id);

    store.select({ type: "pinPaths", refs: [{ layerId, pathId: pathIdA }, { layerId, pathId: pathIdB }] });
    store.commitSelectionMerge();

    const remaining = store.getState().pinLayers[0].pinPaths;
    expect(remaining).toHaveLength(1);
    expect(remaining[0].pins).toHaveLength(3); // every coincident pair collapsed to one

    const thread = store.getState().threadLayers[0].threadPaths[0];
    expect(thread.pinIds).toHaveLength(2);
    for (const id of thread.pinIds) expect(remaining[0].pins.some((p) => p.id === id)).toBe(true);

    store.undo();
    expect(store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathIdA)!).toEqual(originalA);
    expect(store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathIdB)!).toEqual(originalB);
    expect(store.getState().threadLayers[0].threadPaths[0].pinIds).toEqual([originalA.pins[0].id, originalB.pins[1].id]);
  });

  it("is a no-op with fewer than 2 selected paths", () => {
    const store = new EditorStore();
    const { layerId, pathIdA } = seedTwoPaths(store);
    const before = store.getState().pinLayers;
    store.select({ type: "pinPaths", refs: [{ layerId, pathId: pathIdA }] });

    store.commitSelectionMerge();

    expect(store.getState().pinLayers).toEqual(before);
  });

  it("aborts the whole merge with no mutation when any selected path's layer is locked", () => {
    const store = new EditorStore();
    const { layerId, pathIdA, pathIdB } = seedTwoPaths(store);
    const before = store.getState().pinLayers;
    store.togglePinLayerLocked(layerId);
    store.select({ type: "pinPaths", refs: [{ layerId, pathId: pathIdA }, { layerId, pathId: pathIdB }] });

    store.commitSelectionMerge();

    expect(store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathIdA)).toEqual(before.find((l) => l.id === layerId)!.pinPaths.find((p) => p.id === pathIdA));
    expect(store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathIdB)).toEqual(before.find((l) => l.id === layerId)!.pinPaths.find((p) => p.id === pathIdB));
  });

  // Regression test for a live bug report: merging two DIFFERENT shape types (a
  // circle and a line) then scaling the result silently deleted every pin from
  // whichever shape's pins didn't match the single geometry type the merge kept
  // (e.g. merging a circle into a line's identity, then scaling, dropped every pin
  // that had come from the circle — a later Scale/Pin-distance edit always
  // regenerates pins[] strictly from `geometry` via distributePins, so a merged path
  // that kept only one shape's original geometry silently lost the other shape's
  // entire pin contribution on the very next recompute). Fixed by giving the merged
  // path a freehand geometry threading through every combined pin, so recompute
  // regenerates from ALL of them instead of just one shape's worth.
  it("does not lose either shape's pins when a Scale follows a merge of two DIFFERENT shape types", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    const circleId = store.addPinPath(layerId, { type: "circle", center: { x: 0, y: 0 }, radius: 5 })!;
    const lineId = store.addPinPath(layerId, { type: "line", start: { x: 20, y: 0 }, end: { x: 30, y: 0 } })!;
    const circlePins = store.getState().pinLayers[0].pinPaths.find((p) => p.id === circleId)!.pins.length;
    const linePins = store.getState().pinLayers[0].pinPaths.find((p) => p.id === lineId)!.pins.length;
    store.select({ type: "pinPaths", refs: [{ layerId, pathId: circleId }, { layerId, pathId: lineId }] });

    store.commitSelectionMerge();
    const merged = store.getState().pinLayers[0].pinPaths.find((p) => p.id === circleId)!;
    expect(merged.pins).toHaveLength(circlePins + linePins); // both shapes' pins survive the merge itself

    const previous = { pinLayers: store.getState().pinLayers, threadLayers: store.getState().threadLayers };
    const newPinPath = recomputePinPath({ ...merged, geometry: scaleGeometry(merged.geometry, 1.5) });
    store.commitPinPathScale(layerId, circleId, newPinPath, previous);

    const scaled = store.getState().pinLayers[0].pinPaths.find((p) => p.id === circleId)!;
    // The exact post-scale count depends on freehand's open-path distribution, but it
    // must be in the same ballpark as the combined original — nowhere near either
    // shape's count alone, which is what the bug produced (a bare circle or line count).
    expect(scaled.pins.length).toBeGreaterThan(Math.max(circlePins, linePins));
  });
});

describe("EditorStore — commitSelectionMerge, pins-mode (destination path rule)", () => {
  function seedTwoPaths(store: EditorStore) {
    const layerId = store.getState().pinLayers[0].id;
    const pathIdA = store.addPinPath(layerId, { type: "line", start: { x: 0, y: 0 }, end: { x: 3, y: 0 } })!; // 4 pins
    const pathIdB = store.addPinPath(layerId, { type: "line", start: { x: 100, y: 100 }, end: { x: 101, y: 100 } })!; // 2 pins
    return { layerId, pathIdA, pathIdB };
  }

  it("merges into the path that contributed the most selected pins", () => {
    const store = new EditorStore();
    const { layerId, pathIdA, pathIdB } = seedTwoPaths(store);
    const pinsA = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathIdA)!.pins;
    const pinsB = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathIdB)!.pins;
    store.setSelectGranularity("pins");
    store.select({
      type: "pins",
      refs: [
        { layerId, pathId: pathIdA, pinId: pinsA[0].id },
        { layerId, pathId: pathIdA, pinId: pinsA[1].id },
        { layerId, pathId: pathIdB, pinId: pinsB[0].id },
      ],
    });

    store.commitSelectionMerge();

    const pathA = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathIdA)!;
    const pathB = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathIdB)!;
    expect(pathA.pins).toHaveLength(3); // 4 - 2 removed + 1 merged
    expect(pathB.pins).toHaveLength(1); // 2 - 1 removed
    expect(pathA.pins.some((p) => !pinsA.some((orig) => orig.id === p.id))).toBe(true); // new merged pin lives here
  });

  it("is a no-op with fewer than 2 selected pins", () => {
    const store = new EditorStore();
    const { layerId, pathIdA } = seedTwoPaths(store);
    const pinsA = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathIdA)!.pins;
    const before = store.getState().pinLayers;
    store.setSelectGranularity("pins");
    store.select({ type: "pins", refs: [{ layerId, pathId: pathIdA, pinId: pinsA[0].id }] });

    store.commitSelectionMerge();

    expect(store.getState().pinLayers).toEqual(before);
  });
});

describe("canCommitSelectionMerge", () => {
  it("is false for none/threadPath selections and single-member selections", () => {
    expect(canCommitSelectionMerge({ type: "none" })).toBe(false);
    expect(canCommitSelectionMerge({ type: "threadPath", layerId: "l", pathId: "p" })).toBe(false);
    expect(canCommitSelectionMerge({ type: "pinPaths", refs: [{ layerId: "l", pathId: "p" }] })).toBe(false);
    expect(canCommitSelectionMerge({ type: "pins", refs: [{ layerId: "l", pathId: "p", pinId: "x" }] })).toBe(false);
  });

  it("is true for 2+ member pinPaths/pins selections", () => {
    expect(
      canCommitSelectionMerge({ type: "pinPaths", refs: [{ layerId: "l", pathId: "p1" }, { layerId: "l", pathId: "p2" }] }),
    ).toBe(true);
    expect(
      canCommitSelectionMerge({
        type: "pins",
        refs: [{ layerId: "l", pathId: "p", pinId: "a" }, { layerId: "l", pathId: "p", pinId: "b" }],
      }),
    ).toBe(true);
  });
});
