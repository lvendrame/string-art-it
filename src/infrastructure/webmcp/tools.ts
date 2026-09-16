import {
  EditorStore,
  isLayerLocked,
  isThreadLayerLocked,
  projectThreadTotals,
  projectTotalPins,
  type BoardAppearance,
  type BoardDimensions,
  type BoardShape,
  type PinPathGeometry,
  type TriangleType,
} from "../../application/document";

// docs/specs/31-webmcp-agent-tools.md — a genuinely public, stable-contract surface,
// unlike the unstable window.stringArtItDebug test hook (App.tsx). No native browser
// ships navigator.modelContext yet (Chrome 146 Canary only, behind the `webmcp` flag),
// so this file defines the minimal ambient shape itself rather than depending on a
// not-yet-standard lib.d.ts entry.
interface WebMcpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (args: Record<string, unknown>) => unknown;
}

declare global {
  interface Navigator {
    modelContext?: {
      registerTool: (tool: WebMcpTool) => void;
      unregisterTool: (name: string) => void;
    };
  }
}

const GEOMETRY_SCHEMA = {
  description:
    "A Pin Path shape in the board's physical coordinate space (centimetres). `text` geometry is not supported here — it requires font-loading infra that stays UI-only.",
  oneOf: [
    { type: "object", properties: { type: { const: "line" }, start: POINT(), end: POINT() }, required: ["type", "start", "end"] },
    { type: "object", properties: { type: { const: "arc" }, start: POINT(), end: POINT(), curvature: { type: "number" } }, required: ["type", "start", "end", "curvature"] },
    { type: "object", properties: { type: { const: "ellipse" }, center: POINT(), radiusX: { type: "number" }, radiusY: { type: "number" }, rotation: { type: "number" } }, required: ["type", "center", "radiusX", "radiusY", "rotation"] },
    { type: "object", properties: { type: { const: "circle" }, center: POINT(), radius: { type: "number" } }, required: ["type", "center", "radius"] },
    { type: "object", properties: { type: { const: "rectangle" }, position: POINT(), width: { type: "number" }, height: { type: "number" }, rotation: { type: "number" } }, required: ["type", "position", "width", "height", "rotation"] },
    { type: "object", properties: { type: { const: "square" }, position: POINT(), side: { type: "number" }, rotation: { type: "number" } }, required: ["type", "position", "side", "rotation"] },
    { type: "object", properties: { type: { const: "regular-polygon" }, center: POINT(), radius: { type: "number" }, sides: { type: "number" }, rotation: { type: "number" } }, required: ["type", "center", "radius", "sides", "rotation"] },
    { type: "object", properties: { type: { const: "star" }, center: POINT(), outerRadius: { type: "number" }, innerRadius: { type: "number" }, points: { type: "number" }, rotation: { type: "number" } }, required: ["type", "center", "outerRadius", "innerRadius", "points", "rotation"] },
    { type: "object", properties: { type: { const: "polygram" }, center: POINT(), radius: { type: "number" }, points: { type: "number" }, skip: { type: "number" }, rotation: { type: "number" } }, required: ["type", "center", "radius", "points", "skip", "rotation"] },
    { type: "object", properties: { type: { const: "freehand" }, points: { type: "array", items: POINT() } }, required: ["type", "points"] },
  ],
};

function POINT() {
  return { type: "object", properties: { x: { type: "number" }, y: { type: "number" } }, required: ["x", "y"] };
}

function layerSummary(store: EditorStore) {
  const state = store.getState();
  return {
    pinLayers: state.pinLayers.map((l) => ({
      id: l.id,
      name: l.name,
      visible: l.visible,
      locked: l.locked,
      pathCount: l.pinPaths.length,
      pinCount: l.pinPaths.reduce((sum, p) => sum + p.pins.length, 0),
    })),
    threadLayers: state.threadLayers.map((l) => ({
      id: l.id,
      name: l.name,
      visible: l.visible,
      locked: l.locked,
      pathCount: l.threadPaths.length,
    })),
  };
}

function buildTools(store: EditorStore): WebMcpTool[] {
  return [
    {
      name: "get_document_stats",
      description: "Read the current document's board setup, per-layer summaries, pin/thread totals, and undo/redo availability.",
      inputSchema: { type: "object", properties: {} },
      execute: () => {
        const state = store.getState();
        const { pinLayers, threadLayers } = layerSummary(store);
        return {
          board: state.board,
          pinLayers,
          threadLayers,
          totalPins: projectTotalPins(state.pinLayers),
          ...projectThreadTotals(state.threadLayers, state.pinLayers),
          canUndo: store.canUndo(),
          canRedo: store.canRedo(),
        };
      },
    },
    {
      name: "set_board_shape",
      description: "Set the board's shape, optionally its triangle type.",
      inputSchema: {
        type: "object",
        properties: {
          shape: { type: "string", enum: ["circle", "oval", "rectangle", "square", "triangle"] },
          triangleType: { type: "string", enum: ["equilateral", "right-angled"] },
        },
        required: ["shape"],
      },
      execute: (args) => {
        store.setBoardShape(args.shape as BoardShape, args.triangleType as TriangleType | undefined);
        return { board: store.getState().board };
      },
    },
    {
      name: "set_board_dimensions",
      description: "Set one or more of the board's physical dimensions (centimetres): diameter, width, height, side, base — whichever apply to the current shape.",
      inputSchema: {
        type: "object",
        properties: {
          diameter: { type: "number" },
          width: { type: "number" },
          height: { type: "number" },
          side: { type: "number" },
          base: { type: "number" },
        },
      },
      execute: (args) => {
        store.setBoardDimensions(args as Partial<BoardDimensions>);
        return { board: store.getState().board };
      },
    },
    {
      name: "set_board_appearance",
      description: "Set the board's appearance to a solid colour or a named wood/painted preset. Gradients and custom-texture uploads are not supported here — use the UI for those.",
      inputSchema: {
        type: "object",
        oneOf: [
          { properties: { type: { const: "solid" }, colour: { type: "string" } }, required: ["type", "colour"] },
          { properties: { type: { enum: ["wood-texture", "painted-wood"] }, presetId: { type: "string" } }, required: ["type", "presetId"] },
        ],
      },
      execute: (args) => {
        store.setBoardAppearance(args as BoardAppearance);
        return { board: store.getState().board };
      },
    },
    {
      name: "add_pin_layer",
      description: "Create a new Pin Layer and make it the active one.",
      inputSchema: { type: "object", properties: {} },
      execute: () => {
        store.addPinLayer();
        return { layerId: store.getState().activePinLayerId };
      },
    },
    {
      name: "set_active_pin_layer",
      description: "Make an existing Pin Layer the active one (new Pin Paths are added to whichever layer is active).",
      inputSchema: { type: "object", properties: { layerId: { type: "string" } }, required: ["layerId"] },
      execute: (args) => {
        store.setActivePinLayer(args.layerId as string);
        return { activePinLayerId: store.getState().activePinLayerId };
      },
    },
    {
      name: "toggle_pin_layer_visible",
      description: "Toggle a Pin Layer's visibility.",
      inputSchema: { type: "object", properties: { layerId: { type: "string" } }, required: ["layerId"] },
      execute: (args) => {
        store.togglePinLayerVisible(args.layerId as string);
        return { pinLayers: layerSummary(store).pinLayers };
      },
    },
    {
      name: "toggle_pin_layer_locked",
      description: "Toggle a Pin Layer's locked state (locked layers block edits).",
      inputSchema: { type: "object", properties: { layerId: { type: "string" } }, required: ["layerId"] },
      execute: (args) => {
        store.togglePinLayerLocked(args.layerId as string);
        return { pinLayers: layerSummary(store).pinLayers };
      },
    },
    {
      name: "add_pin_path",
      description: "Draw a new Pin Path on a Pin Layer from a geometry description. Pins are distributed automatically using the document's current spacing default.",
      inputSchema: {
        type: "object",
        properties: { layerId: { type: "string" }, geometry: GEOMETRY_SCHEMA },
        required: ["layerId", "geometry"],
      },
      execute: (args) => {
        const layerId = args.layerId as string;
        if (isLayerLocked(store.getState().pinLayers, layerId)) return { success: false, reason: "layer_locked" };
        const pathId = store.addPinPath(layerId, args.geometry as PinPathGeometry);
        if (!pathId) return { success: false, reason: "layer_locked" };
        return { success: true, pathId };
      },
    },
    {
      name: "delete_pin_path",
      description: "Delete a Pin Path (and any Thread Path segments attached to its pins) from a Pin Layer.",
      inputSchema: { type: "object", properties: { layerId: { type: "string" }, pathId: { type: "string" } }, required: ["layerId", "pathId"] },
      execute: (args) => {
        store.deletePinPath(args.layerId as string, args.pathId as string);
        return { success: true };
      },
    },
    {
      name: "add_thread_layer",
      description: "Create a new Thread Layer and make it the active one.",
      inputSchema: { type: "object", properties: {} },
      execute: () => {
        store.addThreadLayer();
        return { layerId: store.getState().activeThreadLayerId };
      },
    },
    {
      name: "set_active_thread_layer",
      description: "Make an existing Thread Layer the active one (new Thread Paths are added to whichever layer is active).",
      inputSchema: { type: "object", properties: { layerId: { type: "string" } }, required: ["layerId"] },
      execute: (args) => {
        store.setActiveThreadLayer(args.layerId as string);
        return { activeThreadLayerId: store.getState().activeThreadLayerId };
      },
    },
    {
      name: "toggle_thread_layer_visible",
      description: "Toggle a Thread Layer's visibility.",
      inputSchema: { type: "object", properties: { layerId: { type: "string" } }, required: ["layerId"] },
      execute: (args) => {
        store.toggleThreadLayerVisible(args.layerId as string);
        return { threadLayers: layerSummary(store).threadLayers };
      },
    },
    {
      name: "toggle_thread_layer_locked",
      description: "Toggle a Thread Layer's locked state (locked layers block edits).",
      inputSchema: { type: "object", properties: { layerId: { type: "string" } }, required: ["layerId"] },
      execute: (args) => {
        store.toggleThreadLayerLocked(args.layerId as string);
        return { threadLayers: layerSummary(store).threadLayers };
      },
    },
    {
      name: "add_thread_path",
      description: "Draw a new Thread Path connecting 2 or more existing pins (by id, in order) on a Thread Layer. Composes the same primitives the click-to-draw UI uses.",
      inputSchema: {
        type: "object",
        properties: { layerId: { type: "string" }, pinIds: { type: "array", items: { type: "string" }, minItems: 2 } },
        required: ["layerId", "pinIds"],
      },
      execute: (args) => {
        const layerId = args.layerId as string;
        const pinIds = args.pinIds as string[];
        if (isThreadLayerLocked(store.getState().threadLayers, layerId)) return { success: false, reason: "layer_locked" };
        if (pinIds.length < 2) return { success: false, reason: "too_few_pins" };
        const before = new Set(store.getState().threadLayers.find((l) => l.id === layerId)?.threadPaths.map((t) => t.id) ?? []);
        store.cancelThreadDraft();
        for (const pinId of pinIds) store.extendThreadDraft(pinId);
        store.finishThreadDraft(layerId);
        const after = store.getState().threadLayers.find((l) => l.id === layerId)?.threadPaths ?? [];
        const created = after.find((t) => !before.has(t.id));
        return created ? { success: true, pathId: created.id } : { success: false, reason: "not_created" };
      },
    },
    {
      name: "delete_thread_path",
      description: "Delete a Thread Path from a Thread Layer.",
      inputSchema: { type: "object", properties: { layerId: { type: "string" }, pathId: { type: "string" } }, required: ["layerId", "pathId"] },
      execute: (args) => {
        store.deleteThreadPath(args.layerId as string, args.pathId as string);
        return { success: true };
      },
    },
    {
      name: "undo",
      description: "Undo the last document change.",
      inputSchema: { type: "object", properties: {} },
      execute: () => {
        store.undo();
        return { canUndo: store.canUndo(), canRedo: store.canRedo() };
      },
    },
    {
      name: "redo",
      description: "Redo the last undone document change.",
      inputSchema: { type: "object", properties: {} },
      execute: () => {
        store.redo();
        return { canUndo: store.canUndo(), canRedo: store.canRedo() };
      },
    },
  ];
}

// Feature-detected: a total no-op in every browser that doesn't implement
// navigator.modelContext yet (every stable browser, as of this writing).
export function registerWebMcpTools(store: EditorStore): () => void {
  if (!("modelContext" in navigator) || !navigator.modelContext) return () => {};
  const modelContext = navigator.modelContext;
  const tools = buildTools(store);
  for (const tool of tools) modelContext.registerTool(tool);
  return () => {
    for (const tool of tools) modelContext.unregisterTool(tool.name);
  };
}
