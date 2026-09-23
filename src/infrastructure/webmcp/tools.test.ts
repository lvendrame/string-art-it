import { afterEach, describe, expect, it, vi } from "vitest";
import { EditorStore } from "@application/document";
import { registerWebMcpTools } from "./tools";

interface RegisteredTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (args: Record<string, unknown>) => unknown;
}

function installMockModelContext() {
  const registered = new Map<string, RegisteredTool>();
  const modelContext = {
    registerTool: vi.fn((tool: RegisteredTool) => registered.set(tool.name, tool)),
    unregisterTool: vi.fn((name: string) => registered.delete(name)),
  };
  (globalThis.navigator as unknown as { modelContext: typeof modelContext }).modelContext = modelContext;
  return { modelContext, registered };
}

afterEach(() => {
  delete (globalThis.navigator as { modelContext?: unknown }).modelContext;
});

// docs/specs/31-webmcp-agent-tools.md — registration + every tool's execute handler is
// the actually-testable surface here (see spec's "real Chrome WebMCP dispatch" scenario
// for why the browser dispatch path itself isn't live-verifiable anywhere yet).

describe("registerWebMcpTools", () => {
  it("is a no-op when navigator.modelContext doesn't exist", () => {
    const store = new EditorStore();
    expect("modelContext" in navigator).toBe(false);
    expect(() => registerWebMcpTools(store)).not.toThrow();
  });

  it("registers every tool exactly once, and cleanup unregisters all of them", () => {
    const { modelContext, registered } = installMockModelContext();
    const store = new EditorStore();

    const cleanup = registerWebMcpTools(store);

    const expectedNames = [
      "get_document_stats",
      "set_board_shape",
      "set_board_dimensions",
      "set_board_appearance",
      "add_pin_layer",
      "set_active_pin_layer",
      "toggle_pin_layer_visible",
      "toggle_pin_layer_locked",
      "add_pin_path",
      "delete_pin_path",
      "add_thread_layer",
      "set_active_thread_layer",
      "toggle_thread_layer_visible",
      "toggle_thread_layer_locked",
      "add_thread_path",
      "delete_thread_path",
      "undo",
      "redo",
    ];
    expect([...registered.keys()].sort()).toEqual([...expectedNames].sort());
    expect(modelContext.registerTool).toHaveBeenCalledTimes(expectedNames.length);

    cleanup();
    expect(registered.size).toBe(0);
    expect(modelContext.unregisterTool).toHaveBeenCalledTimes(expectedNames.length);
  });

  it("get_document_stats reflects live document state", () => {
    const { registered } = installMockModelContext();
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    store.addPinPath(layerId, { type: "line", start: { x: 0, y: 0 }, end: { x: 8, y: 0 } }); // 9 pins
    const pins = store.getState().pinLayers[0].pinPaths[0].pins;
    const threadLayerId = store.getState().threadLayers[0].id;
    store.extendThreadDraft(pins[0].id);
    store.finishThreadDraftWithSegment(threadLayerId, pins[5].id); // 5cm

    registerWebMcpTools(store);
    const result = registered.get("get_document_stats")!.execute({}) as {
      totalPins: number;
      threadCount: number;
      totalLengthCm: number;
      pinLayers: { pathCount: number }[];
      canUndo: boolean;
      canRedo: boolean;
    };

    expect(result.totalPins).toBe(9);
    expect(result.threadCount).toBe(1);
    expect(result.totalLengthCm).toBeCloseTo(5, 6);
    expect(result.pinLayers[0].pathCount).toBe(1);
    expect(result.canUndo).toBe(true);
    expect(result.canRedo).toBe(false);
  });

  it("set_board_dimensions mutates the board and is undoable", () => {
    const { registered } = installMockModelContext();
    const store = new EditorStore();
    registerWebMcpTools(store);

    registered.get("set_board_dimensions")!.execute({ diameter: 45 });
    expect(store.getState().board.dimensions.diameter).toBe(45);

    store.undo();
    expect(store.getState().board.dimensions.diameter).not.toBe(45);
  });

  it("add_pin_path creates a real, selected Pin Path and returns its id", () => {
    const { registered } = installMockModelContext();
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    registerWebMcpTools(store);

    const result = registered.get("add_pin_path")!.execute({
      layerId,
      geometry: { type: "circle", center: { x: 0, y: 0 }, radius: 10 },
    }) as { success: true; pathId: string };

    expect(result.success).toBe(true);
    const path = store.getState().pinLayers[0].pinPaths[0];
    expect(path.id).toBe(result.pathId);
    expect(path.pins.length).toBeGreaterThan(0);
    expect(store.getState().selection).toEqual({ type: "pinPaths", refs: [{ layerId, pathId: path.id }] });
  });

  it("add_pin_path on a locked layer fails structurally, not by throwing", () => {
    const { registered } = installMockModelContext();
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    store.togglePinLayerLocked(layerId);
    registerWebMcpTools(store);

    const result = registered.get("add_pin_path")!.execute({
      layerId,
      geometry: { type: "circle", center: { x: 0, y: 0 }, radius: 10 },
    });

    expect(result).toEqual({ success: false, reason: "layer_locked" });
    expect(store.getState().pinLayers[0].pinPaths).toHaveLength(0);
  });

  it("add_thread_path composes into one thread and one undo step", () => {
    const { registered } = installMockModelContext();
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    store.addPinPath(layerId, { type: "line", start: { x: 0, y: 0 }, end: { x: 8, y: 0 } });
    store.addPinPath(layerId, { type: "line", start: { x: 0, y: 5 }, end: { x: 8, y: 5 } });
    const path0 = store.getState().pinLayers[0].pinPaths[0];
    const path1 = store.getState().pinLayers[0].pinPaths[1];
    const threadLayerId = store.getState().threadLayers[0].id;
    registerWebMcpTools(store);

    const pinIds = [path0.pins[0].id, path0.pins[8].id, path1.pins[0].id, path1.pins[8].id];
    const result = registered.get("add_thread_path")!.execute({ layerId: threadLayerId, pinIds }) as {
      success: true;
      pathId: string;
    };

    expect(result.success).toBe(true);
    const threads = store.getState().threadLayers[0].threadPaths;
    expect(threads).toHaveLength(1);
    expect(threads[0].id).toBe(result.pathId);
    expect(threads[0].pinIds).toEqual(pinIds);

    store.undo();
    expect(store.getState().threadLayers[0].threadPaths).toHaveLength(0);
  });

  it("set_board_shape sets shape and optional triangle type", () => {
    const { registered } = installMockModelContext();
    const store = new EditorStore();
    registerWebMcpTools(store);

    registered.get("set_board_shape")!.execute({ shape: "triangle", triangleType: "right-angled" });

    expect(store.getState().board.shape).toBe("triangle");
    expect(store.getState().board.triangleType).toBe("right-angled");
  });

  it("set_board_appearance sets a solid colour", () => {
    const { registered } = installMockModelContext();
    const store = new EditorStore();
    registerWebMcpTools(store);

    const result = registered.get("set_board_appearance")!.execute({ type: "solid", colour: "#ff0000" }) as {
      board: { appearance: { type: string; colour: string } };
    };

    expect(store.getState().board.appearance).toEqual({ type: "solid", colour: "#ff0000" });
    expect(result.board.appearance.colour).toBe("#ff0000");
  });

  it("add_pin_layer creates a layer and makes it active", () => {
    const { registered } = installMockModelContext();
    const store = new EditorStore();
    registerWebMcpTools(store);

    const result = registered.get("add_pin_layer")!.execute({}) as { layerId: string };

    expect(store.getState().pinLayers).toHaveLength(2);
    expect(store.getState().activePinLayerId).toBe(result.layerId);
  });

  it("set_active_pin_layer switches the active layer", () => {
    const { registered } = installMockModelContext();
    const store = new EditorStore();
    store.addPinLayer();
    const [firstId] = store.getState().pinLayers.map((l) => l.id);
    registerWebMcpTools(store);

    const result = registered.get("set_active_pin_layer")!.execute({ layerId: firstId }) as { activePinLayerId: string };

    expect(result.activePinLayerId).toBe(firstId);
    expect(store.getState().activePinLayerId).toBe(firstId);
  });

  it("toggle_pin_layer_visible and toggle_pin_layer_locked flip their flags", () => {
    const { registered } = installMockModelContext();
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    registerWebMcpTools(store);

    registered.get("toggle_pin_layer_visible")!.execute({ layerId });
    expect(store.getState().pinLayers[0].visible).toBe(false);

    registered.get("toggle_pin_layer_locked")!.execute({ layerId });
    expect(store.getState().pinLayers[0].locked).toBe(true);
  });

  it("delete_pin_path removes the path", () => {
    const { registered } = installMockModelContext();
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    const pathId = store.addPinPath(layerId, { type: "circle", center: { x: 0, y: 0 }, radius: 10 })!;
    registerWebMcpTools(store);

    const result = registered.get("delete_pin_path")!.execute({ layerId, pathId });

    expect(result).toEqual({ success: true });
    expect(store.getState().pinLayers[0].pinPaths).toHaveLength(0);
  });

  it("add_thread_layer creates a thread layer and makes it active", () => {
    const { registered } = installMockModelContext();
    const store = new EditorStore();
    registerWebMcpTools(store);

    const result = registered.get("add_thread_layer")!.execute({}) as { layerId: string };

    expect(store.getState().threadLayers).toHaveLength(2);
    expect(store.getState().activeThreadLayerId).toBe(result.layerId);
  });

  it("set_active_thread_layer switches the active thread layer", () => {
    const { registered } = installMockModelContext();
    const store = new EditorStore();
    store.addThreadLayer();
    const [firstId] = store.getState().threadLayers.map((l) => l.id);
    registerWebMcpTools(store);

    const result = registered.get("set_active_thread_layer")!.execute({ layerId: firstId }) as { activeThreadLayerId: string };

    expect(result.activeThreadLayerId).toBe(firstId);
  });

  it("toggle_thread_layer_visible and toggle_thread_layer_locked flip their flags", () => {
    const { registered } = installMockModelContext();
    const store = new EditorStore();
    const layerId = store.getState().threadLayers[0].id;
    registerWebMcpTools(store);

    registered.get("toggle_thread_layer_visible")!.execute({ layerId });
    expect(store.getState().threadLayers[0].visible).toBe(false);

    registered.get("toggle_thread_layer_locked")!.execute({ layerId });
    expect(store.getState().threadLayers[0].locked).toBe(true);
  });

  it("add_thread_path fails structurally when the thread layer doesn't exist", () => {
    const { registered } = installMockModelContext();
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    store.addPinPath(layerId, { type: "line", start: { x: 0, y: 0 }, end: { x: 8, y: 0 } });
    const path = store.getState().pinLayers[0].pinPaths[0];
    registerWebMcpTools(store);

    const result = registered.get("add_thread_path")!.execute({ layerId: "does-not-exist", pinIds: [path.pins[0].id, path.pins[1].id] });

    expect(result).toEqual({ success: false, reason: "not_created" });
  });

  it("add_thread_path fails structurally on a locked thread layer", () => {
    const { registered } = installMockModelContext();
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    store.addPinPath(layerId, { type: "line", start: { x: 0, y: 0 }, end: { x: 8, y: 0 } });
    const path = store.getState().pinLayers[0].pinPaths[0];
    const threadLayerId = store.getState().threadLayers[0].id;
    store.toggleThreadLayerLocked(threadLayerId);
    registerWebMcpTools(store);

    const result = registered.get("add_thread_path")!.execute({ layerId: threadLayerId, pinIds: [path.pins[0].id, path.pins[1].id] });

    expect(result).toEqual({ success: false, reason: "layer_locked" });
  });

  it("add_thread_path fails structurally with fewer than 2 pins", () => {
    const { registered } = installMockModelContext();
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    store.addPinPath(layerId, { type: "line", start: { x: 0, y: 0 }, end: { x: 8, y: 0 } });
    const path = store.getState().pinLayers[0].pinPaths[0];
    const threadLayerId = store.getState().threadLayers[0].id;
    registerWebMcpTools(store);

    const result = registered.get("add_thread_path")!.execute({ layerId: threadLayerId, pinIds: [path.pins[0].id] });

    expect(result).toEqual({ success: false, reason: "too_few_pins" });
  });

  it("delete_thread_path removes the thread path", () => {
    const { registered } = installMockModelContext();
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    store.addPinPath(layerId, { type: "line", start: { x: 0, y: 0 }, end: { x: 8, y: 0 } });
    const pins = store.getState().pinLayers[0].pinPaths[0].pins;
    const threadLayerId = store.getState().threadLayers[0].id;
    store.extendThreadDraft(pins[0].id);
    store.finishThreadDraftWithSegment(threadLayerId, pins[5].id);
    const pathId = store.getState().threadLayers[0].threadPaths[0].id;
    registerWebMcpTools(store);

    const result = registered.get("delete_thread_path")!.execute({ layerId: threadLayerId, pathId });

    expect(result).toEqual({ success: true });
    expect(store.getState().threadLayers[0].threadPaths).toHaveLength(0);
  });

  it("undo/redo report resulting history state", () => {
    const { registered } = installMockModelContext();
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    store.addPinPath(layerId, { type: "circle", center: { x: 0, y: 0 }, radius: 10 });
    registerWebMcpTools(store);

    const undoResult = registered.get("undo")!.execute({});
    expect(undoResult).toEqual({ canUndo: false, canRedo: true });

    const redoResult = registered.get("redo")!.execute({});
    expect(redoResult).toEqual({ canUndo: true, canRedo: false });
  });
});
