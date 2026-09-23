import { describe, expect, it } from "vitest";
import { EditorStore } from "./EditorStore";

describe("EditorStore board mutations (undoable)", () => {
  it("changing a dimension is undoable", () => {
    const store = new EditorStore();
    const before = store.getState().board.dimensions.diameter;

    store.setBoardDimensions({ diameter: 50 });
    expect(store.getState().board.dimensions.diameter).toBe(50);

    store.undo();
    expect(store.getState().board.dimensions.diameter).toBe(before);
  });

  it("switching shape resets dimensions to that shape's defaults", () => {
    const store = new EditorStore();
    store.setBoardShape("rectangle");
    expect(store.getState().board.dimensions).toEqual({ width: 60, height: 40 });
  });

  it("switching triangle type clears the other type's fields", () => {
    const store = new EditorStore();
    store.setTriangleType("right-angled");
    store.setBoardDimensions({ base: 40, height: 30 });
    expect(store.getState().board.dimensions).toEqual({ base: 40, height: 30 });

    store.setTriangleType("equilateral");
    expect(store.getState().board.dimensions).toEqual({ side: 50 });
  });

  it("notifies subscribers on change", () => {
    const store = new EditorStore();
    let calls = 0;
    const unsubscribe = store.subscribe(() => { calls += 1; });

    store.setBoardDimensions({ diameter: 80 });
    expect(calls).toBe(1);

    unsubscribe();
    store.setBoardDimensions({ diameter: 90 });
    expect(calls).toBe(1);
  });
});

describe("EditorStore transient state (not undoable)", () => {
  it("mode changes are not recorded in history", () => {
    const store = new EditorStore();
    store.setMode("thread");
    expect(store.getState().mode).toBe("thread");
    expect(store.canUndo()).toBe(false);
  });

  it("switching to Pin or Thread mode syncs the Layers panel tab to match", () => {
    const store = new EditorStore();
    expect(store.getState().layerPanelTab).toBe("pin");

    store.setMode("thread");
    expect(store.getState().layerPanelTab).toBe("thread");

    store.setLayerPanelTab("pin");
    store.setMode("pin");
    expect(store.getState().layerPanelTab).toBe("pin");
  });

  it("switching to Select, Pan or Play mode leaves the Layers panel tab untouched", () => {
    const store = new EditorStore();
    store.setMode("thread");
    expect(store.getState().layerPanelTab).toBe("thread");

    store.setMode("pan");
    expect(store.getState().layerPanelTab).toBe("thread");

    store.setMode("select");
    expect(store.getState().layerPanelTab).toBe("thread");
  });

  it("grid visibility and snap-to-grid toggle independently", () => {
    const store = new EditorStore();
    store.setGrid({ visible: false });
    expect(store.getState().grid.visible).toBe(false);
    expect(store.getState().grid.snapEnabled).toBe(true);
  });

  it("viewport changes never touch board dimensions", () => {
    const store = new EditorStore();
    const before = store.getState().board;
    store.setViewport({ zoom: 8, panOrigin: { x: 0, y: 0 } });
    expect(store.getState().board).toBe(before);
  });

  it("picking a Pin-tab tool clears a Pin Path/Pins selection", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    const pathId = store.addPinPath(layerId, { type: "line", start: { x: 0, y: 0 }, end: { x: 10, y: 0 } })!;
    store.select({ type: "pinPaths", refs: [{ layerId, pathId }] });
    expect(store.getState().selection.type).toBe("pinPaths");

    store.setPinTool("eraser");
    expect(store.getState().selection).toEqual({ type: "none" });
  });

  it("picking a Pin-tab draw tool resets pinDefaults and symmetryDefaults, but eraser/path-eraser don't", () => {
    const store = new EditorStore();
    store.setPinProperty({ colour: "#ff0000", diameter: 9 });
    store.setSymmetryConfig({ type: "radial", centre: { x: 0, y: 0 }, intervalDegrees: 60 });

    store.setPinTool("eraser");
    expect(store.getState().pinDefaults.colour).toBe("#ff0000");
    expect(store.getState().symmetryDefaults).toEqual({ type: "radial", centre: { x: 0, y: 0 }, intervalDegrees: 60 });

    store.setPinTool("circle");
    expect(store.getState().pinDefaults).toEqual({ spacing: 1, colour: "#f2ede4", diameter: 2, guideVisible: true });
    expect(store.getState().symmetryDefaults).toEqual({ type: "none" });
  });

  it("entering Pin mode resets pinDefaults and symmetryDefaults, regardless of the last active Pin tool", () => {
    const store = new EditorStore();
    store.setMode("select");
    store.setPinProperty({ colour: "#ff0000", diameter: 9 });
    store.setSymmetryConfig({ type: "radial", centre: { x: 0, y: 0 }, intervalDegrees: 60 });
    store.setPinTool("eraser"); // doesn't reset defaults on its own

    store.setMode("pin");

    expect(store.getState().pinDefaults).toEqual({ spacing: 1, colour: "#f2ede4", diameter: 2, guideVisible: true });
    expect(store.getState().symmetryDefaults).toEqual({ type: "none" });
  });

  it("entering Pin mode resets pinTool to circle, regardless of the last active Pin tool", () => {
    const store = new EditorStore();
    store.setMode("select");
    store.setPinTool("eraser");

    store.setMode("pin");

    expect(store.getState().pinTool).toBe("circle");
  });

  it("entering Select (Edit tab) mode resets selectTool and selectGranularity to their defaults", () => {
    const store = new EditorStore();
    store.setMode("select");
    store.setSelectTool("rotate");
    store.setSelectGranularity("pins");
    store.setMode("thread");

    store.setMode("select");

    expect(store.getState().selectTool).toBe("select");
    expect(store.getState().selectGranularity).toBe("path");
  });

  it("entering Thread mode resets threadTool and threadDefaults to their out-of-the-box values", () => {
    const store = new EditorStore();
    store.setMode("thread");
    store.setThreadTool("eraser");
    store.setThreadProperty({ colours: ["#ff0000", "#00ff00"], width: 4, twistPitch: 10 });
    store.setMode("select");

    store.setMode("thread");

    expect(store.getState().threadTool).toBe("draw");
    expect(store.getState().threadDefaults).toEqual({ colours: ["#5b8def"], width: 1.5, twistPitch: 6 });
  });

  it("entering Pin or Thread mode clears a Pin Path/Pins selection; Edit mode doesn't", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    const pathId = store.addPinPath(layerId, { type: "line", start: { x: 0, y: 0 }, end: { x: 10, y: 0 } })!;
    // addPinPath already leaves this selected (mode "select") — re-select to isolate the assertion.
    store.select({ type: "pinPaths", refs: [{ layerId, pathId }] });

    store.setMode("select");
    expect(store.getState().selection).toEqual({ type: "pinPaths", refs: [{ layerId, pathId }] });

    store.setMode("thread");
    expect(store.getState().selection).toEqual({ type: "none" });

    store.select({ type: "pinPaths", refs: [{ layerId, pathId }] });
    store.setMode("pin");
    expect(store.getState().selection).toEqual({ type: "none" });
  });

  it("entering Pin or Edit mode clears a selected Thread Path; Thread mode doesn't", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    store.addPinPath(layerId, { type: "line", start: { x: 0, y: 0 }, end: { x: 10, y: 0 } });
    const pins = store.getState().pinLayers[0].pinPaths[0].pins;
    const threadLayerId = store.getState().threadLayers[0].id;
    store.extendThreadDraft(pins[0].id);
    store.finishThreadDraftWithSegment(threadLayerId, pins[1].id);
    const threadPathId = store.getState().threadLayers[0].threadPaths[0].id;
    store.select({ type: "threadPath", layerId: threadLayerId, pathId: threadPathId });

    store.setMode("thread");
    expect(store.getState().selection).toEqual({ type: "threadPath", layerId: threadLayerId, pathId: threadPathId });

    store.setMode("select");
    expect(store.getState().selection).toEqual({ type: "none" });

    store.select({ type: "threadPath", layerId: threadLayerId, pathId: threadPathId });
    store.setMode("pin");
    expect(store.getState().selection).toEqual({ type: "none" });
  });

  it("picking a Thread-tab tool clears a selected Thread Path", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    store.addPinPath(layerId, { type: "line", start: { x: 0, y: 0 }, end: { x: 10, y: 0 } });
    const pins = store.getState().pinLayers[0].pinPaths[0].pins;
    const threadLayerId = store.getState().threadLayers[0].id;
    store.extendThreadDraft(pins[0].id);
    store.finishThreadDraftWithSegment(threadLayerId, pins[1].id);
    const threadPathId = store.getState().threadLayers[0].threadPaths[0].id;
    store.select({ type: "threadPath", layerId: threadLayerId, pathId: threadPathId });
    expect(store.getState().selection.type).toBe("threadPath");

    store.setThreadTool("eraser");
    expect(store.getState().selection).toEqual({ type: "none" });
  });

  it("Pin snap toggles independently of grid snap", () => {
    const store = new EditorStore();
    expect(store.getState().snap.pinSnapEnabled).toBe(true);
    store.setPinSnapEnabled(false);
    expect(store.getState().snap.pinSnapEnabled).toBe(false);
  });

  it("leaving Thread mode with an uncommitted Zig-zag/Parabolic draft discards it", () => {
    const store = new EditorStore();
    store.setMode("thread");
    const layerId = store.getState().pinLayers[0].id;
    store.addPinPath(layerId, { type: "circle", center: { x: 0, y: 0 }, radius: 7 });
    const path = store.getState().pinLayers[0].pinPaths[0];
    store.setMode("thread");
    store.startTwoPinDraft("zigzag", path.pins[0].id);
    expect(store.getState().twoPinDraft).not.toBeNull();

    store.setMode("select");
    expect(store.getState().twoPinDraft).toBeNull();
  });

  it("switching away from Zig-zag/Parabolic tool with an uncommitted draft discards it", () => {
    const store = new EditorStore();
    store.setMode("thread");
    const layerId = store.getState().pinLayers[0].id;
    store.addPinPath(layerId, { type: "circle", center: { x: 0, y: 0 }, radius: 7 });
    const path = store.getState().pinLayers[0].pinPaths[0];
    store.startTwoPinDraft("zigzag", path.pins[0].id);
    expect(store.getState().twoPinDraft).not.toBeNull();

    store.setThreadTool("draw");
    expect(store.getState().twoPinDraft).toBeNull();
  });
});

describe("EditorStore defensive no-ops (locked layers / missing targets)", () => {
  it("cancelPolygonDraft with no draft in progress is a no-op", () => {
    const store = new EditorStore();
    expect(() => store.cancelPolygonDraft()).not.toThrow();
    expect(store.getState().polygonDraft).toBeNull();
  });

  it("setSymmetryConfig on a selected path in a locked layer is a no-op", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    const pathId = store.addPinPath(layerId, { type: "line", start: { x: 0, y: 0 }, end: { x: 10, y: 0 } })!;
    const before = store.getState().pinLayers[0].pinPaths[0];
    store.select({ type: "pinPaths", refs: [{ layerId, pathId }] });
    store.togglePinLayerLocked(layerId);

    store.setSymmetryConfig({ type: "radial", centre: { x: 0, y: 0 }, intervalDegrees: 60 });

    expect(store.getState().pinLayers[0].pinPaths[0]).toEqual(before);
  });

  it("deletePinPath doesn't touch the selection when the deleted path isn't the selected one", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    const pathIdA = store.addPinPath(layerId, { type: "line", start: { x: 0, y: 0 }, end: { x: 10, y: 0 } })!;
    const pathIdB = store.addPinPath(layerId, { type: "line", start: { x: 0, y: 20 }, end: { x: 10, y: 20 } })!;
    store.select({ type: "pinPaths", refs: [{ layerId, pathId: pathIdB }] });

    store.deletePinPath(layerId, pathIdA);

    expect(store.getState().selection).toEqual({ type: "pinPaths", refs: [{ layerId, pathId: pathIdB }] });
  });

  it("setPinProperty on a selected path in a locked layer is a no-op", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    const pathId = store.addPinPath(layerId, { type: "line", start: { x: 0, y: 0 }, end: { x: 10, y: 0 } })!;
    const before = store.getState().pinLayers[0].pinPaths[0];
    store.select({ type: "pinPaths", refs: [{ layerId, pathId }] });
    store.togglePinLayerLocked(layerId);

    store.setPinProperty({ colour: "#ff0000" });

    expect(store.getState().pinLayers[0].pinPaths[0]).toEqual(before);
  });

  it("erasePin on a locked layer is a no-op", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    const pathId = store.addPinPath(layerId, { type: "line", start: { x: 0, y: 0 }, end: { x: 10, y: 0 } })!;
    const pins = store.getState().pinLayers[0].pinPaths[0].pins;
    const before = store.getState().pinLayers[0].pinPaths[0];
    store.togglePinLayerLocked(layerId);

    store.erasePin(layerId, pathId, pins[0].id);

    expect(store.getState().pinLayers[0].pinPaths[0]).toEqual(before);
  });

  it("erasePinPath on a locked layer, and on a missing path, are both no-ops", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    const pathId = store.addPinPath(layerId, { type: "line", start: { x: 0, y: 0 }, end: { x: 10, y: 0 } })!;
    const before = store.getState().pinLayers[0].pinPaths[0];
    store.togglePinLayerLocked(layerId);

    store.erasePinPath(layerId, pathId);
    expect(store.getState().pinLayers[0].pinPaths[0]).toEqual(before);

    store.togglePinLayerLocked(layerId);
    expect(() => store.erasePinPath(layerId, "missing-path")).not.toThrow();
    expect(store.getState().pinLayers[0].pinPaths[0]).toEqual(before);
  });

  it("commitPinPathScale is a silent no-op when the path is missing from `previous`", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    const pathId = store.addPinPath(layerId, { type: "circle", center: { x: 0, y: 0 }, radius: 4 })!;
    const path = store.getState().pinLayers[0].pinPaths[0];
    const before = store.getState().pinLayers[0].pinPaths;
    const previous = { pinLayers: store.getState().pinLayers.map((l) => ({ ...l, pinPaths: [] })), threadLayers: store.getState().threadLayers };

    expect(() => store.commitPinPathScale(layerId, pathId, path, previous)).not.toThrow();
    expect(store.getState().pinLayers[0].pinPaths).toEqual(before);
  });

  it("commitPinPathsScale skips an update whose path is missing from `previous`, but still applies the rest", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    const pathId = store.addPinPath(layerId, { type: "circle", center: { x: 0, y: 0 }, radius: 4 })!;
    const path = store.getState().pinLayers[0].pinPaths[0];
    const scaled = { ...path, geometry: { type: "circle" as const, center: { x: 0, y: 0 }, radius: 8 } };
    const previous = { pinLayers: store.getState().pinLayers, threadLayers: store.getState().threadLayers };

    store.commitPinPathsScale(
      [
        { layerId, pathId: "missing-path", newPinPath: scaled },
        { layerId, pathId, newPinPath: scaled },
      ],
      previous,
    );

    const updated = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathId)!;
    expect(updated.geometry).toEqual(scaled.geometry);
  });

  it("commitSelectionMerge in Pins granularity is a no-op on a locked layer, or with fewer than 2 resolved pins", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    const pathId = store.addPinPath(layerId, { type: "line", start: { x: 0, y: 0 }, end: { x: 10, y: 0 } })!;
    const pins = store.getState().pinLayers[0].pinPaths[0].pins;
    const before = store.getState().pinLayers[0].pinPaths[0];

    store.togglePinLayerLocked(layerId);
    store.select({ type: "pins", refs: [{ layerId, pathId, pinId: pins[0].id }, { layerId, pathId, pinId: pins[1].id }] });
    store.commitSelectionMerge();
    expect(store.getState().pinLayers[0].pinPaths[0]).toEqual(before);

    store.togglePinLayerLocked(layerId);
    store.select({ type: "pins", refs: [{ layerId, pathId, pinId: pins[0].id }, { layerId, pathId, pinId: "missing-pin" }] });
    store.commitSelectionMerge();
    expect(store.getState().pinLayers[0].pinPaths[0]).toEqual(before);
  });

  it("deleteThreadPath and eraseThreadSegment on a locked Thread Layer are no-ops", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    store.addPinPath(layerId, { type: "line", start: { x: 0, y: 0 }, end: { x: 10, y: 0 } });
    const pins = store.getState().pinLayers[0].pinPaths[0].pins;
    const threadLayerId = store.getState().threadLayers[0].id;
    store.extendThreadDraft(pins[0].id);
    store.finishThreadDraftWithSegment(threadLayerId, pins[1].id);
    const threadPathId = store.getState().threadLayers[0].threadPaths[0].id;
    store.toggleThreadLayerLocked(threadLayerId);
    const before = store.getState().threadLayers[0];

    store.deleteThreadPath(threadLayerId, threadPathId);
    expect(store.getState().threadLayers[0]).toEqual(before);

    store.eraseThreadSegment(threadLayerId, threadPathId, 0);
    expect(store.getState().threadLayers[0]).toEqual(before);
  });

  it("duplicatePinLayer and deletePinLayer with a missing layer id are no-ops", () => {
    const store = new EditorStore();
    const before = store.getState().pinLayers;

    expect(() => store.duplicatePinLayer("missing-layer")).not.toThrow();
    expect(store.getState().pinLayers).toEqual(before);

    expect(() => store.deletePinLayer("missing-layer")).not.toThrow();
    expect(store.getState().pinLayers).toEqual(before);
  });

  it("duplicateThreadLayer with a missing layer id is a no-op", () => {
    const store = new EditorStore();
    const before = store.getState().threadLayers;
    expect(() => store.duplicateThreadLayer("missing-layer")).not.toThrow();
    expect(store.getState().threadLayers).toEqual(before);
  });
});

describe("EditorStore Zig-zag/Parabolic two-pin draft lifecycle", () => {
  function setup(tool: "zigzag" | "parabolic" = "zigzag") {
    const store = new EditorStore();
    store.setMode("thread");
    const layerId = store.getState().pinLayers[0].id;
    const pathId = store.addPinPath(layerId, { type: "circle", center: { x: 0, y: 0 }, radius: 7 })!;
    store.setMode("thread");
    const path = store.getState().pinLayers[0].pinPaths[0];
    store.startTwoPinDraft(tool, path.pins[0].id);
    return { store, layerId, pathId, path };
  }

  it("setTwoPinChosenCandidate is a no-op with no draft, with no candidates yet, or when the index is unchanged", () => {
    const store = new EditorStore();
    expect(() => store.setTwoPinChosenCandidate(1)).not.toThrow();

    const { store: store2, layerId, path } = setup();
    store2.chooseSecondPin(layerId, path.pins[2].id); // populates 2+ candidates
    const draft = store2.getState().twoPinDraft!;
    expect(draft.candidates.length).toBeGreaterThan(1);

    store2.setTwoPinChosenCandidate(draft.chosenIndex); // same index: no-op
    expect(store2.getState().twoPinDraft).toEqual(draft);

    store2.setTwoPinChosenCandidate(1);
    expect(store2.getState().twoPinDraft!.chosenIndex).toBe(1);
  });

  it("resolveTwoPinDraft is a no-op with no draft, or before any candidates exist", () => {
    const store = new EditorStore();
    expect(() => store.resolveTwoPinDraft("layer")).not.toThrow();

    const { store: store2, layerId } = setup();
    store2.resolveTwoPinDraft(layerId); // draft exists but chooseSecondPin never ran
    expect(store2.getState().twoPinDraft).not.toBeNull();
  });

  it("cancelTwoPinDraft is a no-op when no draft is in progress", () => {
    const store = new EditorStore();
    expect(() => store.cancelTwoPinDraft()).not.toThrow();
    expect(store.getState().twoPinDraft).toBeNull();
  });

  it("retractTwoPinDraft: no-op with no draft, cancels outright before candidates exist, steps back once they do", () => {
    const store = new EditorStore();
    expect(() => store.retractTwoPinDraft()).not.toThrow();

    const { store: store2, layerId, path } = setup();
    store2.retractTwoPinDraft(); // no candidates yet -> cancels outright
    expect(store2.getState().twoPinDraft).toBeNull();

    store2.startTwoPinDraft("zigzag", path.pins[0].id);
    store2.chooseSecondPin(layerId, path.pins[2].id);
    expect(store2.getState().twoPinDraft!.candidates.length).toBeGreaterThan(1);

    store2.retractTwoPinDraft(); // candidates exist -> steps back to awaiting 2nd pin
    expect(store2.getState().twoPinDraft).toMatchObject({ candidates: [], chosenIndex: 0 });
  });

  it("chooseSecondPin is a no-op with no draft, or when the second pin is the same as the first", () => {
    const store = new EditorStore();
    expect(() => store.chooseSecondPin("layer", "pin")).not.toThrow();

    const { store: store2, layerId, path } = setup();
    store2.chooseSecondPin(layerId, path.pins[0].id); // same as firstPinId
    expect(store2.getState().twoPinDraft).toMatchObject({ candidates: [] });
  });

  it("chooseSecondPin falls back to cross-path candidates when the same-path algorithm finds none", () => {
    const store = new EditorStore();
    store.setMode("thread");
    const layerId = store.getState().pinLayers[0].id;
    store.addPinPath(layerId, { type: "line", start: { x: 0, y: 0 }, end: { x: 10, y: 0 } });
    store.addPinPath(layerId, { type: "line", start: { x: 0, y: 20 }, end: { x: 10, y: 20 } });
    store.setMode("thread");
    const [pathA, pathB] = store.getState().pinLayers[0].pinPaths;
    store.startTwoPinDraft("zigzag", pathA.pins[0].id);

    store.chooseSecondPin(layerId, pathB.pins[0].id);

    // Same-path search finds nothing for two different paths, so this only succeeds
    // if it fell through to the cross-path algorithm.
    expect(store.getState().twoPinDraft).not.toBeNull();
    expect(store.getState().twoPinDraft!.candidates.length).toBeGreaterThan(0);
  });

  it("chooseSecondPin reads Parabolic settings when the draft's tool is parabolic", () => {
    const { store, layerId, path } = setup("parabolic");
    expect(() => store.chooseSecondPin(layerId, path.pins[2].id)).not.toThrow();
  });

  it("chooseSecondPin is a no-op when the second pin belongs to no path at all", () => {
    const { store, layerId } = setup();
    const before = store.getState().twoPinDraft;
    store.chooseSecondPin(layerId, "not-a-real-pin");
    expect(store.getState().twoPinDraft).toEqual(before);
  });

  it("committing a two-pin sequence on a locked Thread Layer is a no-op", () => {
    const { store, layerId, path } = setup();
    store.toggleThreadLayerLocked(layerId);
    const before = store.getState().threadLayers[0];

    store.chooseSecondPin(layerId, path.pins[Math.floor(path.pins.length / 2)].id);

    expect(store.getState().threadLayers[0]).toEqual(before);
  });
});

describe("EditorStore thread/pin layer management", () => {
  it("toggleThreadLayerVisible toggles a Thread Layer's visibility, undoably", () => {
    const store = new EditorStore();
    const layerId = store.getState().threadLayers[0].id;
    const before = store.getState().threadLayers[0].visible;

    store.toggleThreadLayerVisible(layerId);
    expect(store.getState().threadLayers[0].visible).toBe(!before);

    store.undo();
    expect(store.getState().threadLayers[0].visible).toBe(before);
  });

  it("reorderThreadLayer moves a Thread Layer up/down, undoably", () => {
    const store = new EditorStore();
    store.addThreadLayer();
    const [firstId, secondId] = store.getState().threadLayers.map((l) => l.id);

    store.reorderThreadLayer(secondId, -1);
    expect(store.getState().threadLayers.map((l) => l.id)).toEqual([secondId, firstId]);

    store.undo();
    expect(store.getState().threadLayers.map((l) => l.id)).toEqual([firstId, secondId]);
  });

  it("deleteThreadLayer removes the layer, undoably, and reassigns the active layer if it was the deleted one", () => {
    const store = new EditorStore();
    store.addThreadLayer();
    const [firstId, secondId] = store.getState().threadLayers.map((l) => l.id);
    store.setActiveThreadLayer(secondId);

    store.deleteThreadLayer(secondId);
    expect(store.getState().threadLayers.map((l) => l.id)).toEqual([firstId]);
    expect(store.getState().activeThreadLayerId).toBe(firstId);

    store.undo();
    expect(store.getState().threadLayers.map((l) => l.id)).toEqual([firstId, secondId]);
  });

  it("deleteThreadLayer doesn't touch the active layer id when a different layer is deleted", () => {
    const store = new EditorStore();
    store.addThreadLayer();
    const [firstId, secondId] = store.getState().threadLayers.map((l) => l.id);
    store.setActiveThreadLayer(firstId);

    store.deleteThreadLayer(secondId);

    expect(store.getState().activeThreadLayerId).toBe(firstId);
  });
});

describe("EditorStore loadProject", () => {
  it("falls back to the current active layer ids when the loaded document has no layers", () => {
    const store = new EditorStore();
    const before = { activePinLayerId: store.getState().activePinLayerId, activeThreadLayerId: store.getState().activeThreadLayerId };

    store.loadProject({
      board: store.getState().board,
      grid: store.getState().grid,
      pinLayers: [],
      threadLayers: [],
    });

    expect(store.getState().activePinLayerId).toBe(before.activePinLayerId);
    expect(store.getState().activeThreadLayerId).toBe(before.activeThreadLayerId);
    expect(store.getState().pinLayers).toEqual([]);
    expect(store.getState().threadLayers).toEqual([]);
  });
});
