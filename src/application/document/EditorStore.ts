import { HistoryStack } from "../commands/HistoryStack";
import { SetValueCommand } from "../commands/SetValueCommand";
import { createDefaultBoard, defaultDimensionsFor, clampDimension, type Board, type BoardAppearance, type BoardDimensions, type BoardShape, type TriangleType } from "./board";
import type {
  EditorMode,
  EditorState,
  GridSettings,
  PinDefaults,
  PinPathRef,
  PinRef,
  PinTool,
  SelectGranularity,
  SelectTool,
  Selection,
  ThreadDefaults,
  ThreadTool,
} from "./EditorState";
import {
  addPinPathToLayers,
  createPinLayer,
  duplicatePinLayer as clonePinLayer,
  erasePinFromLayers,
  findPinPath,
  isLayerLocked,
  mergePinsInLayers,
  removePinPathFromLayers,
  updatePinPathInLayers,
  type PinLayer,
} from "./pinLayer";
import { deleteLayer, renameLayer, reorderLayer, toggleLayerLocked, toggleLayerVisible } from "./layerOps";
import { createPinPath, nextPinId, recomputePinPath, type Pin, type PinPath, type PinPathGeometry } from "./pinPath";
import { NO_SYMMETRY, buildNearestPinRemap, type SymmetryConfig } from "./symmetryConfig";
import { combinePinPaths, resolveMergeDestinationPath } from "./multiSelect";
import {
  addThreadPathToLayers,
  createThreadLayer,
  duplicateThreadLayer as cloneThreadLayer,
  findThreadPath,
  isThreadLayerLocked,
  remapPinsInAllThreadLayers,
  remapPinsInAllThreadLayersByMap,
  removePinFromAllThreadLayers,
  removeThreadPathFromLayers,
  splitThreadPathInLayer,
  updateThreadPathInLayers,
  type ThreadLayer,
} from "./threadLayer";
import { createThreadPath, type ThreadPath } from "./threadPath";
import { computeNextPatternPinId } from "./threadPattern";
import { serializeProject, type ProjectFile, type SerializableDocument } from "./projectFile";
import { defaultPrintSettings, type PrintSettings } from "./printSettings";
import { seedCounterFrom } from "./idCounter";

// A freshly loaded document (Open, autosave restore) may carry ids minted by a counter
// that had already advanced further than this session's — bump every relevant counter
// past what's already here so newly created layers/paths/pins/threads can never reuse
// one of them (docs/specs/16-persistence.md).
// docs/specs/26-edit-mode-multi-select.md — shared enabled/disabled predicate for the
// Merge action button (SelectToolbar) and the radial menu's Merge slice, so both stay
// in sync with the same rule: at least 2 members in a path- or pins-granularity
// selection (a "none"/"threadPath" selection, or fewer than 2 members, can't merge).
export function canCommitSelectionMerge(selection: Selection): boolean {
  return (selection.type === "pinPaths" || selection.type === "pins") && selection.refs.length >= 2;
}

function seedIdCountersFrom(doc: SerializableDocument): void {
  for (const layer of doc.pinLayers) {
    seedCounterFrom(layer.id);
    for (const path of layer.pinPaths) {
      seedCounterFrom(path.id);
      for (const pin of path.pins) seedCounterFrom(pin.id);
    }
  }
  for (const layer of doc.threadLayers) {
    seedCounterFrom(layer.id);
    for (const threadPath of layer.threadPaths) seedCounterFrom(threadPath.id);
  }
}

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
      selectTool: "select",
      selectGranularity: "path",
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

  // Switching into Pin or Thread mode also switches the Layers panel to the matching
  // tab (if it isn't already showing it) — keeps the visible layer list consistent
  // with which kind of layer the current tool actually edits.
  setMode(mode: EditorMode): void {
    const layerPanelTab = mode === "pin" || mode === "thread" ? mode : this.state.layerPanelTab;
    this.state = { ...this.state, mode, layerPanelTab };
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

  setSelectTool(tool: SelectTool): void {
    this.state = { ...this.state, selectTool: tool };
    this.notify();
  }

  // docs/specs/26-edit-mode-multi-select.md — flipping the Pin Path/Pins granularity
  // switch clears the current selection: a path-selection and a pin-selection are
  // different kinds of things and are never translated across the switch. Same "sync
  // belongs in the store method that changes the driving state" template as setMode's
  // layerPanelTab sync (docs/conventions/ui-patterns.md).
  setSelectGranularity(granularity: SelectGranularity): void {
    this.state = { ...this.state, selectGranularity: granularity, selection: { type: "none" } };
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
  //
  // Finishing a new Pin Path hands off to Edit mode with that path selected, so the
  // just-drawn shape is immediately ready for Move/Rotate/Scale/property editing
  // instead of leaving the user back in the same draw tool — same "sync belongs in
  // the store method that changes the driving state" template as setMode's
  // layerPanelTab sync (docs/conventions/ui-patterns.md).
  addPinPath(layerId: string, geometry: PinPathGeometry): string | null {
    if (isLayerLocked(this.state.pinLayers, layerId)) return null;
    const pinPath = createPinPath(geometry, this.state.pinDefaults.spacing, this.state.pinDefaults, this.state.symmetryDefaults);
    this.runLayersChange(addPinPathToLayers(this.state.pinLayers, layerId, pinPath));
    this.setMode("select");
    this.select({ type: "pinPaths", refs: [{ layerId, pathId: pinPath.id }] });
    return pinPath.id;
  }

  // docs/specs/06-symmetry.md: symmetry is set while drawing (bakes into new Pin
  // Paths) or, with a Pin Path selected, changes that path's symmetry — same dual-
  // context pattern as setPinProperty, and "Symmetry changes" is an undoable operation
  // (docs/specs/10-undo-redo.md) in the selected-path case.
  setSymmetryConfig(config: SymmetryConfig): void {
    const { selection } = this.state;
    // Symmetry editing is single-object-shaped, per docs/specs/06-symmetry.md — with
    // exactly one Pin Path selected, edit it; otherwise (none, multi-path, pins, or a
    // Thread Path selected) fall back to changing the drawing defaults, same as before.
    if (selection.type === "pinPaths" && selection.refs.length === 1) {
      const { layerId, pathId } = selection.refs[0];
      if (isLayerLocked(this.state.pinLayers, layerId)) return;
      this.runLayersChange(
        updatePinPathInLayers(this.state.pinLayers, layerId, pathId, (path) => ({
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
    if (this.state.selection.type === "pinPaths" && this.state.selection.refs.some((r) => r.pathId === pathId)) {
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
  //
  // A spacing (Pin distance) change recomputes pins, per docs/specs/21-scale-and-pin-
  // distance.md, and must reattach any Thread Path referencing the old pins to their
  // nearest new pin — routed through commitPinPathWithReattach so that lands in the
  // SAME undo step, unlike colour/diameter/guide changes which never touch pins.
  setPinProperty(patch: Partial<PinDefaults>): void {
    const { selection } = this.state;
    if (selection.type === "pinPaths" && selection.refs.length === 1) {
      const { layerId, pathId } = selection.refs[0];
      if (isLayerLocked(this.state.pinLayers, layerId)) return;
      const path = findPinPath(this.state.pinLayers, layerId, pathId);
      if (!path) return;
      const withPatch: PinPath = {
        ...path,
        requestedSpacing: patch.spacing ?? path.requestedSpacing,
        colour: patch.colour ?? path.colour,
        diameter: patch.diameter ?? path.diameter,
        guideVisible: patch.guideVisible ?? path.guideVisible,
      };
      if (patch.spacing !== undefined) {
        this.commitPinPathWithReattach(layerId, pathId, recomputePinPath(withPatch), {
          pinLayers: this.state.pinLayers,
          threadLayers: this.state.threadLayers,
        });
        return;
      }
      this.runLayersChange(updatePinPathInLayers(this.state.pinLayers, layerId, pathId, () => withPatch));
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

  // docs/specs/11-erasers.md Path Eraser — deletes every pin in a Pin Path, cascading
  // into referencing thread segments, as ONE undoable operation (same pattern as
  // deletePinLayer, scoped to one path instead of a whole layer).
  erasePinPath(layerId: string, pathId: string): void {
    if (isLayerLocked(this.state.pinLayers, layerId)) return;
    const path = findPinPath(this.state.pinLayers, layerId, pathId);
    if (!path) return;
    const pinIds = path.pins.map((pin) => pin.id);
    const nextPinLayers = removePinPathFromLayers(this.state.pinLayers, layerId, pathId);
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
    if (this.state.selection.type === "pinPaths" && this.state.selection.refs.some((r) => r.pathId === pathId)) {
      this.select({ type: "none" });
    }
  }

  // docs/specs/26-edit-mode-multi-select.md — every selected Pin Path's live document
  // object, in selection order. Empty unless the current selection is path-granularity.
  getSelectedPinPaths(): PinPath[] {
    const { selection } = this.state;
    if (selection.type !== "pinPaths") return [];
    return selection.refs
      .map((r) => findPinPath(this.state.pinLayers, r.layerId, r.pathId))
      .filter((p): p is PinPath => !!p);
  }

  // Thin single-object wrapper kept for every pre-existing single-selection consumer
  // (PinPropertiesPanel, SymmetryPanel, Canvas.tsx, useKeyboardTransform's single-path
  // fallback) — behaves exactly as before: defined only when exactly one Pin Path is
  // selected, undefined for none/multi/pins/threadPath selections.
  getSelectedPinPath(): PinPath | undefined {
    const paths = this.getSelectedPinPaths();
    return paths.length === 1 ? paths[0] : undefined;
  }

  // docs/specs/27-thread-select-tool.md
  getSelectedThreadPath(): ThreadPath | undefined {
    const { selection } = this.state;
    if (selection.type !== "threadPath") return undefined;
    return findThreadPath(this.state.threadLayers, selection.layerId, selection.pathId);
  }

  // --- Edit mode: Move / Rotation / Scale / Merge (docs/specs/09-selection-and-
  // editing.md, docs/specs/21-scale-and-pin-distance.md, docs/specs/26-edit-mode-
  // multi-select.md) ---

  // Live preview only — bypasses undo history entirely, like setViewport. The real
  // committed transform happens once, on release, via commitPinPath(s)Transform /
  // commitPinsTransform. Plural form previews every affected path in one pass (path-
  // mode multi-select, or pins-mode drags — the calling hook patches each affected
  // path's full pins[] array, only the selected pins' positions actually differing).
  previewPinPaths(updates: { layerId: string; pathId: string; pins: Pin[] }[]): void {
    let pinLayers = this.state.pinLayers;
    for (const u of updates) pinLayers = updatePinPathInLayers(pinLayers, u.layerId, u.pathId, (p) => ({ ...p, pins: u.pins }));
    this.state = { ...this.state, pinLayers };
    this.notify();
  }

  previewPinPathPins(layerId: string, pathId: string, pins: Pin[]): void {
    this.previewPinPaths([{ layerId, pathId, pins }]);
  }

  // Move/Rotation commit. Takes the already-transformed `pins` (same ids, moved
  // positions — computed by the calling hook the same way as its live preview)
  // instead of recomputing via distributePins: unlike a SelectionPanel geometry edit,
  // Move/Rotation must NOT mint fresh pin ids, or every Thread Path segment touching
  // this Pin Path would silently orphan (nothing remaps thread pinIds after a plain
  // geometry edit, unlike the Merge/Erase tools, which cascade explicitly). Keeping
  // ids stable also means any pins already removed by the Pin Eraser survive a Move.
  // Takes an explicit `previous` snapshot (captured at gesture start by the calling
  // hook) instead of reading this.state.pinLayers: by commit time, this.state.pinLayers
  // holds the last PREVIEW frame's temporarily-swapped pins, not the true pre-gesture
  // state, so it can't be trusted as the undo-`previous` here.
  commitPinPathTransform(layerId: string, pathId: string, geometry: PinPathGeometry, pins: Pin[], previous: PinLayer[]): void {
    // Checked against the LIVE lock flag (this.state.pinLayers), not `previous` — the
    // layer could have been locked via the Layers panel mid-drag; `previous` only
    // exists to give undo the correct pre-gesture pins/geometry snapshot.
    if (isLayerLocked(this.state.pinLayers, layerId)) {
      this.setPinLayers(previous);
      return;
    }
    const next = updatePinPathInLayers(previous, layerId, pathId, (path) => ({ ...path, geometry, pins }));
    const command = new SetValueCommand<PinLayer[]>((l) => this.setPinLayers(l), previous, next);
    this.history.run(command);
  }

  // docs/specs/26-edit-mode-multi-select.md — Move/Rotation commit across N selected
  // Pin Paths (path granularity), bundled as ONE undo step. Same in-place, stable-id
  // semantics as commitPinPathTransform, applied per path; all-or-nothing lock abort
  // across every involved path.
  commitPinPathsTransform(
    updates: { layerId: string; pathId: string; geometry: PinPathGeometry; pins: Pin[] }[],
    previous: PinLayer[],
  ): void {
    if (updates.some((u) => isLayerLocked(this.state.pinLayers, u.layerId))) {
      this.setPinLayers(previous);
      return;
    }
    let next = previous;
    for (const u of updates) {
      next = updatePinPathInLayers(next, u.layerId, u.pathId, (path) => ({ ...path, geometry: u.geometry, pins: u.pins }));
    }
    const command = new SetValueCommand<PinLayer[]>((l) => this.setPinLayers(l), previous, next);
    this.history.run(command);
  }

  // docs/specs/26-edit-mode-multi-select.md pins granularity — Move/Rotation/Scale
  // commit as a direct raw x/y transform of just the selected pins. The owning Pin
  // Path's geometry/requestedSpacing is left untouched (same "custom/stale" precedent
  // the Pin Eraser already established when removing individual pins, docs/specs/
  // 11-erasers.md) — no pin-count recompute, no distribution re-run. ALWAYS one
  // bundled undo step, even spanning multiple paths/layers; all-or-nothing lock abort.
  commitPinsTransform(
    updates: { layerId: string; pathId: string; pinId: string; x: number; y: number }[],
    previous: PinLayer[],
  ): void {
    if (updates.some((u) => isLayerLocked(this.state.pinLayers, u.layerId))) {
      this.setPinLayers(previous);
      return;
    }
    let next = previous;
    for (const u of updates) {
      next = updatePinPathInLayers(next, u.layerId, u.pathId, (path) => ({
        ...path,
        pins: path.pins.map((pin) => (pin.id === u.pinId ? { ...pin, x: u.x, y: u.y } : pin)),
      }));
    }
    const command = new SetValueCommand<PinLayer[]>((l) => this.setPinLayers(l), previous, next);
    this.history.run(command);
  }

  // Abandon a Move/Rotation drag (Esc, or mouseup outside the canvas) — restores the
  // pre-gesture pins with a plain, non-undoable write; nothing reaches history.
  restorePinLayers(previous: PinLayer[]): void {
    this.setPinLayers(previous);
  }

  // docs/specs/21-scale-and-pin-distance.md Nearest-Pin Reattachment — shared by the
  // Scale tool commit and the Pin distance property change: both recompute pins (fresh
  // ids, unlike Move/Rotation's in-place ones) and must reattach every Thread Path pin
  // reference to whichever new pin sits nearest the corresponding old one, bundled into
  // the SAME undo step as the pin change (same SetValueCommand<{pinLayers,
  // threadLayers}> pattern as erasePin/erasePinPath/commitMergeSelection above).
  private commitPinPathWithReattach(
    layerId: string,
    pathId: string,
    newPinPath: PinPath,
    previous: { pinLayers: PinLayer[]; threadLayers: ThreadLayer[] },
  ): void {
    const oldPath = findPinPath(previous.pinLayers, layerId, pathId);
    if (!oldPath) return;
    const remap = buildNearestPinRemap(oldPath, newPinPath);
    const nextPinLayers = updatePinPathInLayers(previous.pinLayers, layerId, pathId, () => newPinPath);
    const nextThreadLayers = remapPinsInAllThreadLayersByMap(previous.threadLayers, remap);
    const prev = { pinLayers: previous.pinLayers, threadLayers: previous.threadLayers };
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

  // docs/specs/21-scale-and-pin-distance.md Scale tool commit. Same lock check and
  // `previous` snapshot convention as commitPinPathTransform (the calling hook captures
  // `previous` at gesture start, since this.state.pinLayers holds the last live-preview
  // frame by commit time) — but unlike Move/Rotation, Scale changes the path's length
  // and therefore its pin COUNT, so ids can't stay stable; it recomputes pins and
  // reattaches threads via commitPinPathWithReattach instead of a plain pins swap.
  commitPinPathScale(
    layerId: string,
    pathId: string,
    newPinPath: PinPath,
    previous: { pinLayers: PinLayer[]; threadLayers: ThreadLayer[] },
  ): void {
    if (isLayerLocked(this.state.pinLayers, layerId)) {
      this.setPinLayers(previous.pinLayers);
      return;
    }
    this.commitPinPathWithReattach(layerId, pathId, newPinPath, previous);
  }

  // docs/specs/26-edit-mode-multi-select.md — Scale commit across N selected Pin
  // Paths (path granularity). Each path recomputes its own pins (fresh ids) and
  // reattaches threads via nearest-pin remap, same as commitPinPathScale, but every
  // path's remap is UNIONED into one combined map so the whole gesture — every
  // selected path's pin recompute AND every affected thread reattachment — commits as
  // ONE undo step. All-or-nothing lock abort across every involved path.
  commitPinPathsScale(
    updates: { layerId: string; pathId: string; newPinPath: PinPath }[],
    previous: { pinLayers: PinLayer[]; threadLayers: ThreadLayer[] },
  ): void {
    if (updates.some((u) => isLayerLocked(this.state.pinLayers, u.layerId))) {
      this.setPinLayers(previous.pinLayers);
      return;
    }
    let nextPinLayers = previous.pinLayers;
    const combinedRemap = new Map<string, string>();
    for (const u of updates) {
      const oldPath = findPinPath(previous.pinLayers, u.layerId, u.pathId);
      if (!oldPath) continue;
      for (const [k, v] of buildNearestPinRemap(oldPath, u.newPinPath)) combinedRemap.set(k, v);
      nextPinLayers = updatePinPathInLayers(nextPinLayers, u.layerId, u.pathId, () => u.newPinPath);
    }
    const nextThreadLayers = remapPinsInAllThreadLayersByMap(previous.threadLayers, combinedRemap);
    const prev = { pinLayers: previous.pinLayers, threadLayers: previous.threadLayers };
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

  // docs/specs/26-edit-mode-multi-select.md — Merge is an instant action fired against
  // the CURRENT selection, not a tool you switch into (replaces the old Merge-tool
  // accumulate-then-commit gesture entirely — see canCommitSelectionMerge below for
  // the shared enabled/disabled predicate the toolbar button and radial menu use).
  // No-op below 2 selected members. All-or-nothing abort if any involved Pin Path's
  // layer is locked — selection is left intact, same as the old Merge tool's rule.
  commitSelectionMerge(): void {
    const { selection } = this.state;
    if (selection.type === "pinPaths" && selection.refs.length >= 2) {
      this.commitPathModeMerge(selection.refs);
      return;
    }
    if (selection.type === "pins" && selection.refs.length >= 2) {
      this.commitPinsModeMerge(selection.refs);
    }
  }

  // docs/specs/26-edit-mode-multi-select.md path-mode Merge: combine every selected
  // Pin Path's pins into the first-selected path (which keeps its own id/style/
  // symmetry — the other selected paths are removed entirely, their pins having been
  // pooled into the destination). Coincident pins collapse and EVERY surviving pin
  // gets a fresh id (combinePinPaths), so every original pin across every selected
  // path needs its thread references remapped — bundled with the pin change as ONE
  // undo step, same {pinLayers,threadLayers} SetValueCommand pattern as Scale.
  //
  // The destination's `geometry` is replaced with a freehand geometry threading
  // through the combined pins (in the same order as the merged pins[]), NOT left as
  // whichever single shape type the first-selected path happened to be. Keeping (say)
  // a bare "circle" geometry while pins[] actually holds a circle+line's worth of
  // points would be a silent data-loss trap: every later pins-from-geometry recompute
  // (Scale, Pin distance — see commitPinPathScale/setPinProperty) regenerates pins[]
  // strictly from `geometry`, so a merged path that kept a single shape's original
  // geometry would have the OTHER shape's entire pin contribution silently deleted on
  // the very next Scale (found live: merging a circle with a line, then scaling,
  // deleted every pin from whichever shape didn't match the retained geometry type).
  // A freehand geometry through every merged pin keeps the path self-consistent for
  // every future recompute, at the cost of the merged shape no longer being described
  // as "this is a circle" — an accepted, documented tradeoff (data loss is worse).
  private commitPathModeMerge(refs: PinPathRef[]): void {
    if (refs.some((r) => isLayerLocked(this.state.pinLayers, r.layerId))) return;
    const paths = refs.map((r) => findPinPath(this.state.pinLayers, r.layerId, r.pathId)).filter((p): p is PinPath => !!p);
    if (paths.length < 2) return;
    const destination = refs[0];
    const { pins, remap } = combinePinPaths(paths);
    const mergedGeometry: PinPathGeometry = { type: "freehand", points: pins.map((p) => ({ x: p.x, y: p.y })) };
    const withCombinedPins = updatePinPathInLayers(this.state.pinLayers, destination.layerId, destination.pathId, (path) => ({
      ...path,
      geometry: mergedGeometry,
      pins,
    }));
    const nextPinLayers = refs
      .slice(1)
      .reduce((layers, r) => removePinPathFromLayers(layers, r.layerId, r.pathId), withCombinedPins);
    const nextThreadLayers = remapPinsInAllThreadLayersByMap(this.state.threadLayers, remap);
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
    this.select({ type: "pinPaths", refs: [destination] });
  }

  // docs/specs/26-edit-mode-multi-select.md pins-mode Merge: same per-pin averaging/
  // thread-repoint rule as today's Merge, but the destination path is resolved by
  // resolveMergeDestinationPath's most-selected-pins/centroid/id-tiebreak rule instead
  // of "first-clicked wins".
  private commitPinsModeMerge(refs: PinRef[]): void {
    if (refs.some((r) => isLayerLocked(this.state.pinLayers, r.layerId))) return;
    const oldPinIds = new Set(refs.map((r) => r.pinId));
    const points = refs
      .map((r) => findPinPath(this.state.pinLayers, r.layerId, r.pathId)?.pins.find((p) => p.id === r.pinId))
      .filter((p): p is Pin => !!p);
    if (points.length < 2) return;
    const newPinPos = {
      x: points.reduce((s, p) => s + p.x, 0) / points.length,
      y: points.reduce((s, p) => s + p.y, 0) / points.length,
    };
    const destination = resolveMergeDestinationPath(this.state.pinLayers, refs, newPinPos);
    const newPin: Pin = { id: nextPinId(), ...newPinPos };

    const nextPinLayers = mergePinsInLayers(this.state.pinLayers, oldPinIds, destination, newPin);
    const nextThreadLayers = remapPinsInAllThreadLayers(this.state.threadLayers, oldPinIds, newPin.id);
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
    this.select({ type: "pins", refs: [{ ...destination, pinId: newPin.id }] });
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

  // docs/specs/27-thread-select-tool.md — dual-context, same pattern as
  // setPinProperty: with a Thread Path selected, edits apply to it; otherwise they
  // change the defaults used by the next drawn thread. One method, one set of fields
  // in ThreadPropertiesPanel — no duplicate colour/width/twist-pitch controls between
  // a "next thread" panel and a "selected thread" panel.
  setThreadProperty(patch: Partial<{ colours: string[]; width: number; twistPitch: number }>): void {
    const { selection } = this.state;
    if (selection.type === "threadPath") {
      if (isThreadLayerLocked(this.state.threadLayers, selection.layerId)) return;
      const next = updateThreadPathInLayers(this.state.threadLayers, selection.layerId, selection.pathId, (path) => ({ ...path, ...patch }));
      const command = new SetValueCommand<ThreadLayer[]>((l) => this.setThreadLayers(l), this.state.threadLayers, next);
      this.history.run(command);
      return;
    }
    this.setThreadDefaults(patch);
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

  // Right Arrow while drawing (docs/specs/22-thread-follow-pattern.md): once the
  // draft has 4+ vertices, extrapolate the next one from the numeric pin-position
  // pattern the vertices form. No-ops (nothing to undo/redo) when the pattern can't
  // be resolved — e.g. fewer than 4 vertices yet, or a relevant vertex is a
  // symmetry-mirrored pin id with no stable position of its own.
  advanceThreadDraftByPattern(): void {
    const draft = this.state.threadDraft;
    if (!draft) return;
    const nextPinId = computeNextPatternPinId(this.state.pinLayers, draft.pinIds);
    if (!nextPinId) return;
    this.extendThreadDraft(nextPinId);
  }

  deleteThreadPath(layerId: string, pathId: string): void {
    if (isThreadLayerLocked(this.state.threadLayers, layerId)) return;
    const nextLayers = removeThreadPathFromLayers(this.state.threadLayers, layerId, pathId);
    const command = new SetValueCommand<ThreadLayer[]>((l) => this.setThreadLayers(l), this.state.threadLayers, nextLayers);
    this.history.run(command);
  }

  // docs/specs/11-erasers.md Segment Eraser — removes one segment from a Thread Path,
  // splitting it into up to two fragments; unlike the Path Eraser, pins are untouched.
  eraseThreadSegment(layerId: string, pathId: string, segmentIndex: number): void {
    if (isThreadLayerLocked(this.state.threadLayers, layerId)) return;
    const nextLayers = splitThreadPathInLayer(this.state.threadLayers, layerId, pathId, segmentIndex);
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
    seedIdCountersFrom(doc);
    this.state = {
      ...this.state,
      board: doc.board,
      grid: { ...this.state.grid, gapX: doc.grid.gapX, gapY: doc.grid.gapY, colour: doc.grid.colour, opacity: doc.grid.opacity },
      pinLayers: doc.pinLayers,
      threadLayers: doc.threadLayers,
      activePinLayerId: doc.pinLayers[0]?.id ?? this.state.activePinLayerId,
      activeThreadLayerId: doc.threadLayers[0]?.id ?? this.state.activeThreadLayerId,
      selection: { type: "none" },
      selectTool: "select",
      selectGranularity: "path",
      threadDraft: null,
    };
    this.notify();
  }
}
