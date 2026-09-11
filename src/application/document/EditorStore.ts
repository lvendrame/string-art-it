import { HistoryStack } from "../commands/HistoryStack";
import { SetValueCommand } from "../commands/SetValueCommand";
import { createDefaultBoard, defaultDimensionsFor, clampDimension, type Board, type BoardAppearance, type BoardDimensions, type BoardShape, type TriangleType } from "./board";
import type { EditorMode, EditorState, GridSettings, PinDefaults, PinTool, Selection, ThreadDefaults, ThreadTool } from "./EditorState";
import {
  addPinPathToLayers,
  createPinLayer,
  duplicatePinLayer as clonePinLayer,
  erasePinFromLayers,
  findPinPath,
  isLayerLocked,
  removePinPathFromLayers,
  updatePinPathInLayers,
  type PinLayer,
} from "./pinLayer";
import { deleteLayer, renameLayer, reorderLayer, toggleLayerLocked, toggleLayerVisible } from "./layerOps";
import { createPinPath, recomputePinPath, type PinPathGeometry } from "./pinPath";
import { NO_SYMMETRY, type SymmetryConfig } from "./symmetryConfig";
import {
  addThreadPathToLayers,
  createThreadLayer,
  duplicateThreadLayer as cloneThreadLayer,
  isThreadLayerLocked,
  removePinFromAllThreadLayers,
  removeThreadPathFromLayers,
  type ThreadLayer,
} from "./threadLayer";
import { createThreadPath } from "./threadPath";
import { serializeProject, type ProjectFile, type SerializableDocument } from "./projectFile";
import { defaultPrintSettings, type PrintSettings } from "./printSettings";

// The Document Engine's mutable root (docs/specs/01-architecture.md). Board mutations
// route through HistoryStack (undoable, per docs/specs/03-board-configuration.md
// "Board dimension change is undoable"); mode/grid/snap/viewport are transient
// interaction state, never undoable (docs/specs/10-undo-redo.md's list omits them, and
// §37 "viewport changes never modify physical dimensions").
export class EditorStore {
  private state: EditorState;
  private readonly history = new HistoryStack();
  private readonly listeners = new Set<() => void>();

  constructor(initial?: Partial<EditorState>) {
    const defaultPinLayer = createPinLayer("Layer 1");
    const defaultThreadLayer = createThreadLayer("Layer 1");
    this.state = {
      board: createDefaultBoard(),
      mode: "pin",
      grid: { gapX: 1, gapY: 1, visible: true, snapEnabled: true, colour: "#6d5ef7", opacity: 0.6 },
      snap: { pinSnapEnabled: true, radiusPx: 12 },
      viewport: { zoom: 4, panOrigin: { x: -40, y: -40 } },
      pinLayers: [defaultPinLayer],
      activePinLayerId: defaultPinLayer.id,
      pinTool: "circle",
      pinDefaults: { spacing: 1, colour: "#f2ede4", diameter: 2, guideVisible: true },
      symmetryDefaults: NO_SYMMETRY,
      selection: { type: "none" },
      threadLayers: [defaultThreadLayer],
      activeThreadLayerId: defaultThreadLayer.id,
      threadTool: "draw",
      threadDefaults: { colours: ["#5b8def"], width: 1.5, twistPitch: 6 },
      threadDraft: null,
      layerPanelTab: "pin",
      printSettings: defaultPrintSettings(),
      ...initial,
    };
  }

  getState = (): EditorState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private notify(): void {
    for (const listener of this.listeners) listener();
  }

  private setBoard(board: Board): void {
    this.state = { ...this.state, board };
    this.notify();
  }

  private runBoardChange(nextBoard: Board): void {
    const command = new SetValueCommand<Board>((b) => this.setBoard(b), this.state.board, nextBoard);
    this.history.run(command);
  }

  setBoardShape(shape: BoardShape, triangleType?: TriangleType): void {
    const dimensions = defaultDimensionsFor(shape, triangleType);
    this.runBoardChange({ ...this.state.board, shape, triangleType, dimensions });
  }

  setTriangleType(triangleType: TriangleType): void {
    const dimensions = defaultDimensionsFor("triangle", triangleType);
    this.runBoardChange({ ...this.state.board, shape: "triangle", triangleType, dimensions });
  }

  setBoardDimensions(patch: Partial<BoardDimensions>): void {
    const clamped: BoardDimensions = {};
    for (const [key, value] of Object.entries(patch)) {
      clamped[key as keyof BoardDimensions] = clampDimension(value as number);
    }
    this.runBoardChange({
      ...this.state.board,
      dimensions: { ...this.state.board.dimensions, ...clamped },
    });
  }

  setBoardAppearance(appearance: BoardAppearance): void {
    this.runBoardChange({ ...this.state.board, appearance });
  }

  undo(): void {
    this.history.undo();
    this.notify();
  }

  redo(): void {
    this.history.redo();
    this.notify();
  }

  canUndo(): boolean {
    return this.history.canUndo();
  }

  canRedo(): boolean {
    return this.history.canRedo();
  }

  // --- transient, non-undoable state ---

  setMode(mode: EditorMode): void {
    this.state = { ...this.state, mode };
    this.notify();
  }

  setGrid(patch: Partial<GridSettings>): void {
    this.state = { ...this.state, grid: { ...this.state.grid, ...patch } };
    this.notify();
  }

  setPinSnapEnabled(enabled: boolean): void {
    this.state = { ...this.state, snap: { ...this.state.snap, pinSnapEnabled: enabled } };
    this.notify();
  }

  setViewport(viewport: EditorState["viewport"]): void {
    this.state = { ...this.state, viewport };
    this.notify();
  }

  setPinTool(tool: PinTool): void {
    this.state = { ...this.state, pinTool: tool };
    this.notify();
  }

  select(selection: Selection): void {
    this.state = { ...this.state, selection };
    this.notify();
  }

  private setPinLayers(pinLayers: PinLayer[]): void {
    this.state = { ...this.state, pinLayers };
    this.notify();
  }

  private runLayersChange(nextLayers: PinLayer[]): void {
    const command = new SetValueCommand<PinLayer[]>((l) => this.setPinLayers(l), this.state.pinLayers, nextLayers);
    this.history.run(command);
  }

  // docs/specs/12-pin-drawing-tools + §22 snapping: geometry arrives already resolved
  // (snap pipeline runs in the UI layer, which owns pointer/viewport concerns).
  addPinPath(layerId: string, geometry: PinPathGeometry): string | null {
    if (isLayerLocked(this.state.pinLayers, layerId)) return null;
    const pinPath = createPinPath(geometry, this.state.pinDefaults.spacing, this.state.pinDefaults, this.state.symmetryDefaults);
    this.runLayersChange(addPinPathToLayers(this.state.pinLayers, layerId, pinPath));
    return pinPath.id;
  }

  // docs/specs/06-symmetry.md: symmetry is set while drawing (bakes into new Pin
  // Paths) or, with a Pin Path selected, changes that path's symmetry — same dual-
  // context pattern as setPinProperty, and "Symmetry changes" is an undoable operation
  // (docs/specs/10-undo-redo.md) in the selected-path case.
  setSymmetryConfig(config: SymmetryConfig): void {
    const { selection } = this.state;
    if (selection.type === "pinPath") {
      if (isLayerLocked(this.state.pinLayers, selection.layerId)) return;
      this.runLayersChange(
        updatePinPathInLayers(this.state.pinLayers, selection.layerId, selection.pathId, (path) => ({
          ...path,
          symmetry: config,
        })),
      );
      return;
    }
    this.state = { ...this.state, symmetryDefaults: config };
    this.notify();
  }

  deletePinPath(layerId: string, pathId: string): void {
    if (isLayerLocked(this.state.pinLayers, layerId)) return;
    this.runLayersChange(removePinPathFromLayers(this.state.pinLayers, layerId, pathId));
    if (this.state.selection.type === "pinPath" && this.state.selection.pathId === pathId) {
      this.select({ type: "none" });
    }
  }

  updatePinPathGeometry(layerId: string, pathId: string, geometry: PinPathGeometry): void {
    if (isLayerLocked(this.state.pinLayers, layerId)) return;
    this.runLayersChange(
      updatePinPathInLayers(this.state.pinLayers, layerId, pathId, (path) =>
        recomputePinPath({ ...path, geometry }),
      ),
    );
  }

  // docs/specs/11-pin-properties + §11-existing-object-editing: with a Pin Path
  // selected, edits apply to it; otherwise they change the defaults used by the next
  // newly-created Pin Path. One method encodes both contexts, matching the spec.
  setPinProperty(patch: Partial<PinDefaults>): void {
    const { selection } = this.state;
    if (selection.type === "pinPath") {
      if (isLayerLocked(this.state.pinLayers, selection.layerId)) return;
      this.runLayersChange(
        updatePinPathInLayers(this.state.pinLayers, selection.layerId, selection.pathId, (path) => {
          const next = {
            ...path,
            requestedSpacing: patch.spacing ?? path.requestedSpacing,
            colour: patch.colour ?? path.colour,
            diameter: patch.diameter ?? path.diameter,
            guideVisible: patch.guideVisible ?? path.guideVisible,
          };
          return patch.spacing !== undefined ? recomputePinPath(next) : next;
        }),
      );
      return;
    }
    this.state = { ...this.state, pinDefaults: { ...this.state.pinDefaults, ...patch } };
    this.notify();
  }

  // docs/specs/11-erasers.md: deleting a pin cascades into every thread segment that
  // referenced it, as ONE undoable operation — both layer trees change together.
  erasePin(layerId: string, pathId: string, pinId: string): void {
    if (isLayerLocked(this.state.pinLayers, layerId)) return;
    const nextPinLayers = erasePinFromLayers(this.state.pinLayers, layerId, pathId, pinId);
    const nextThreadLayers = removePinFromAllThreadLayers(this.state.threadLayers, pinId);
    const prev = { pinLayers: this.state.pinLayers, threadLayers: this.state.threadLayers };
    const next = { pinLayers: nextPinLayers, threadLayers: nextThreadLayers };
    const command = new SetValueCommand<typeof next>(
      (v) => {
        this.state = { ...this.state, ...v };
        this.notify();
      },
      prev,
      next,
    );
    this.history.run(command);
  }

  getSelectedPinPath() {
    const { selection } = this.state;
    if (selection.type !== "pinPath") return undefined;
    return findPinPath(this.state.pinLayers, selection.layerId, selection.pathId);
  }

  // --- Thread editor (docs/specs/12-thread-editor.md) ---

  setThreadTool(tool: ThreadTool): void {
    this.state = { ...this.state, threadTool: tool };
    this.notify();
  }

  setThreadDefaults(patch: Partial<ThreadDefaults>): void {
    this.state = { ...this.state, threadDefaults: { ...this.state.threadDefaults, ...patch } };
    this.notify();
  }

  // §26-thread-drawing-workflow: first click starts the draft; each further click
  // extends it and the destination becomes the next origin.
  extendThreadDraft(pinId: string): void {
    const draft = this.state.threadDraft;
    this.state = { ...this.state, threadDraft: { pinIds: draft ? [...draft.pinIds, pinId] : [pinId] } };
    this.notify();
  }

  private setThreadLayers(threadLayers: ThreadLayer[]): void {
    this.state = { ...this.state, threadLayers };
    this.notify();
  }

  private commitThreadDraft(layerId: string): void {
    const draft = this.state.threadDraft;
    this.state = { ...this.state, threadDraft: null };
    if (!draft || draft.pinIds.length < 2) {
      this.notify();
      return;
    }
    if (isThreadLayerLocked(this.state.threadLayers, layerId)) {
      this.notify();
      return;
    }
    const threadPath = createThreadPath(draft.pinIds, this.state.threadDefaults.colours, this.state.threadDefaults.width, this.state.threadDefaults.twistPitch);
    const nextLayers = addThreadPathToLayers(this.state.threadLayers, layerId, threadPath);
    const command = new SetValueCommand<ThreadLayer[]>((l) => this.setThreadLayers(l), this.state.threadLayers, nextLayers);
    this.history.run(command);
  }

  // §29-ending-cutting-thread: double-click adds the final segment then finishes.
  finishThreadDraftWithSegment(layerId: string, pinId: string): void {
    this.extendThreadDraft(pinId);
    this.commitThreadDraft(layerId);
  }

  // Right-click: finish at the last confirmed pin, no new segment added.
  finishThreadDraft(layerId: string): void {
    this.commitThreadDraft(layerId);
  }

  // Esc: 0 confirmed segments (<=1 pin) cancels outright; >=1 segment finishes as-is.
  escapeThreadDraft(layerId: string): void {
    const draft = this.state.threadDraft;
    if (!draft || draft.pinIds.length < 2) {
      this.state = { ...this.state, threadDraft: null };
      this.notify();
      return;
    }
    this.commitThreadDraft(layerId);
  }

  cancelThreadDraft(): void {
    this.state = { ...this.state, threadDraft: null };
    this.notify();
  }

  // Left Arrow while drawing: undo the last confirmed vertex. Removing the only
  // vertex ends the insertion outright, same as Esc with zero confirmed segments.
  retractThreadDraft(): void {
    const draft = this.state.threadDraft;
    if (!draft) return;
    const pinIds = draft.pinIds.slice(0, -1);
    this.state = { ...this.state, threadDraft: pinIds.length > 0 ? { pinIds } : null };
    this.notify();
  }

  deleteThreadPath(layerId: string, pathId: string): void {
    if (isThreadLayerLocked(this.state.threadLayers, layerId)) return;
    const nextLayers = removeThreadPathFromLayers(this.state.threadLayers, layerId, pathId);
    const command = new SetValueCommand<ThreadLayer[]>((l) => this.setThreadLayers(l), this.state.threadLayers, nextLayers);
    this.history.run(command);
  }

  // --- Layers (docs/specs/13-layers.md) ---

  setLayerPanelTab(tab: "pin" | "thread"): void {
    this.state = { ...this.state, layerPanelTab: tab };
    this.notify();
  }

  setActivePinLayer(layerId: string): void {
    this.state = { ...this.state, activePinLayerId: layerId };
    this.notify();
  }

  setActiveThreadLayer(layerId: string): void {
    this.state = { ...this.state, activeThreadLayerId: layerId };
    this.notify();
  }

  addPinLayer(): void {
    const layer = createPinLayer(`Layer ${this.state.pinLayers.length + 1}`);
    const command = new SetValueCommand<PinLayer[]>((l) => this.setPinLayers(l), this.state.pinLayers, [...this.state.pinLayers, layer]);
    this.history.run(command);
    this.setActivePinLayer(layer.id);
  }

  renamePinLayer(layerId: string, name: string): void {
    const command = new SetValueCommand<PinLayer[]>((l) => this.setPinLayers(l), this.state.pinLayers, renameLayer(this.state.pinLayers, layerId, name));
    this.history.run(command);
  }

  togglePinLayerVisible(layerId: string): void {
    const command = new SetValueCommand<PinLayer[]>((l) => this.setPinLayers(l), this.state.pinLayers, toggleLayerVisible(this.state.pinLayers, layerId));
    this.history.run(command);
  }

  togglePinLayerLocked(layerId: string): void {
    const command = new SetValueCommand<PinLayer[]>((l) => this.setPinLayers(l), this.state.pinLayers, toggleLayerLocked(this.state.pinLayers, layerId));
    this.history.run(command);
  }

  reorderPinLayer(layerId: string, direction: -1 | 1): void {
    const command = new SetValueCommand<PinLayer[]>((l) => this.setPinLayers(l), this.state.pinLayers, reorderLayer(this.state.pinLayers, layerId, direction));
    this.history.run(command);
  }

  duplicatePinLayer(layerId: string): void {
    const layer = this.state.pinLayers.find((l) => l.id === layerId);
    if (!layer) return;
    const copy = clonePinLayer(layer);
    const command = new SetValueCommand<PinLayer[]>((l) => this.setPinLayers(l), this.state.pinLayers, [...this.state.pinLayers, copy]);
    this.history.run(command);
  }

  // Deleting a Pin Layer removes every pin it contains, cascading into any thread
  // segments referencing them — same one-undo-step guarantee as erasePin.
  deletePinLayer(layerId: string): void {
    const layer = this.state.pinLayers.find((l) => l.id === layerId);
    if (!layer) return;
    const pinIds = layer.pinPaths.flatMap((p) => p.pins.map((pin) => pin.id));
    const nextPinLayers = deleteLayer(this.state.pinLayers, layerId);
    const nextThreadLayers = pinIds.reduce((acc, pinId) => removePinFromAllThreadLayers(acc, pinId), this.state.threadLayers);
    const prev = { pinLayers: this.state.pinLayers, threadLayers: this.state.threadLayers };
    const next = { pinLayers: nextPinLayers, threadLayers: nextThreadLayers };
    const command = new SetValueCommand<typeof next>(
      (v) => {
        this.state = { ...this.state, ...v };
        this.notify();
      },
      prev,
      next,
    );
    this.history.run(command);
    if (this.state.activePinLayerId === layerId && nextPinLayers[0]) this.setActivePinLayer(nextPinLayers[0].id);
  }

  addThreadLayer(): void {
    const layer = createThreadLayer(`Layer ${this.state.threadLayers.length + 1}`);
    const command = new SetValueCommand<ThreadLayer[]>((l) => this.setThreadLayers(l), this.state.threadLayers, [...this.state.threadLayers, layer]);
    this.history.run(command);
    this.setActiveThreadLayer(layer.id);
  }

  renameThreadLayer(layerId: string, name: string): void {
    const command = new SetValueCommand<ThreadLayer[]>((l) => this.setThreadLayers(l), this.state.threadLayers, renameLayer(this.state.threadLayers, layerId, name));
    this.history.run(command);
  }

  toggleThreadLayerVisible(layerId: string): void {
    const command = new SetValueCommand<ThreadLayer[]>((l) => this.setThreadLayers(l), this.state.threadLayers, toggleLayerVisible(this.state.threadLayers, layerId));
    this.history.run(command);
  }

  toggleThreadLayerLocked(layerId: string): void {
    const command = new SetValueCommand<ThreadLayer[]>((l) => this.setThreadLayers(l), this.state.threadLayers, toggleLayerLocked(this.state.threadLayers, layerId));
    this.history.run(command);
  }

  reorderThreadLayer(layerId: string, direction: -1 | 1): void {
    const command = new SetValueCommand<ThreadLayer[]>((l) => this.setThreadLayers(l), this.state.threadLayers, reorderLayer(this.state.threadLayers, layerId, direction));
    this.history.run(command);
  }

  duplicateThreadLayer(layerId: string): void {
    const layer = this.state.threadLayers.find((l) => l.id === layerId);
    if (!layer) return;
    const copy = cloneThreadLayer(layer);
    const command = new SetValueCommand<ThreadLayer[]>((l) => this.setThreadLayers(l), this.state.threadLayers, [...this.state.threadLayers, copy]);
    this.history.run(command);
  }

  deleteThreadLayer(layerId: string): void {
    const nextLayers = deleteLayer(this.state.threadLayers, layerId);
    const command = new SetValueCommand<ThreadLayer[]>((l) => this.setThreadLayers(l), this.state.threadLayers, nextLayers);
    this.history.run(command);
    if (this.state.activeThreadLayerId === layerId && nextLayers[0]) this.setActiveThreadLayer(nextLayers[0].id);
  }

  // Print visibility is independent from editor visibility (docs/specs/14-printing.md)
  // — deliberately not routed through Command history; it's an output/view setting.
  setPrintSettings(patch: Partial<PrintSettings>): void {
    this.state = { ...this.state, printSettings: { ...this.state.printSettings, ...patch } };
    this.notify();
  }

  // --- Persistence (docs/specs/16-persistence.md) ---

  toProjectFile(): ProjectFile {
    return serializeProject({
      board: this.state.board,
      grid: { gapX: this.state.grid.gapX, gapY: this.state.grid.gapY, colour: this.state.grid.colour, opacity: this.state.grid.opacity },
      pinLayers: this.state.pinLayers,
      threadLayers: this.state.threadLayers,
    });
  }

  // Loading a document is not itself undoable, and it starts a FRESH undo history —
  // undoing past a load into the previous document's edits would be incoherent.
  loadProject(doc: SerializableDocument): void {
    this.history.clear();
    this.state = {
      ...this.state,
      board: doc.board,
      grid: { ...this.state.grid, gapX: doc.grid.gapX, gapY: doc.grid.gapY, colour: doc.grid.colour, opacity: doc.grid.opacity },
      pinLayers: doc.pinLayers,
      threadLayers: doc.threadLayers,
      activePinLayerId: doc.pinLayers[0]?.id ?? this.state.activePinLayerId,
      activeThreadLayerId: doc.threadLayers[0]?.id ?? this.state.activeThreadLayerId,
      selection: { type: "none" },
      threadDraft: null,
    };
    this.notify();
  }
}
