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
});
