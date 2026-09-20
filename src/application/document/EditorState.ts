import type { Viewport } from "../../domain/transforms";
import type { Point } from "../../domain/paths";
import type { Board } from "./board";
import type { GeneratorParams } from "./generator/generatorPatterns";
import type { PinLayer } from "./pinLayer";
import type { PinPath, PinStyle } from "./pinPath";
import type { SymmetryConfig } from "./symmetryConfig";
import type { ThreadLayer } from "./threadLayer";
import type { ThreadPath } from "./threadPath";
import type { PrintSettings } from "./printSettings";

// docs/specs/06-canvas-and-viewport.md §Editor Modes; docs/specs/19-play-mode.md;
// docs/specs/32-generator-mode.md
export type EditorMode = "select" | "pin" | "thread" | "pan" | "play" | "generate";

export interface GridSettings {
  gapX: number;
  gapY: number;
  visible: boolean;
  snapEnabled: boolean;
  colour: string;
  opacity: number;
}

export interface SnapSettings {
  pinSnapEnabled: boolean;
  radiusPx: number;
}

// docs/specs/12-pin-drawing-tools
export type PinTool =
  | "line"
  | "arc"
  | "ellipse"
  | "circle"
  | "rectangle"
  | "square"
  | "pentagon"
  | "hexagon"
  | "octagon"
  | "star-5"
  | "star-6"
  | "star-8"
  | "pentagram"
  | "heptagram"
  | "octagram"
  | "freehand"
  | "polygon"
  | "text"
  | "eraser"
  | "path-eraser";

// docs/specs/26-edit-mode-multi-select.md — a reference to a whole Pin Path, or to one
// individual pin within a Pin Path, used by the multi-select Selection variants below.
export interface PinPathRef {
  layerId: string;
  pathId: string;
}
export interface PinRef {
  layerId: string;
  pathId: string;
  pinId: string;
}

// "pinPaths"/"pins" hold 1+ refs (docs/specs/26-edit-mode-multi-select.md) — a single
// selected Pin Path is just a length-1 "pinPaths" selection, not a separate variant.
export type Selection =
  | { type: "none" }
  | { type: "pinPaths"; refs: PinPathRef[] }
  | { type: "pins"; refs: PinRef[] }
  | { type: "threadPath"; layerId: string; pathId: string };

// docs/specs/09-selection-and-editing.md, docs/specs/26-edit-mode-multi-select.md —
// the Edit-mode tool area. "merge" is not a tool here — per 26, Merge is an instant
// action fired against the current selection, not a mode you switch into.
export type SelectTool = "select" | "move" | "rotate" | "scale";

// docs/specs/26-edit-mode-multi-select.md — the granularity switch.
export type SelectGranularity = "path" | "pins";

export interface PinDefaults extends PinStyle {
  spacing: number;
}

// docs/specs/24-thread-mode, docs/specs/27-thread-select-tool.md,
// docs/specs/35-zigzag-parabolic-tools.md
export type ThreadTool = "draw" | "eraser" | "segment-eraser" | "select" | "zigzag" | "parabolic";

export interface ThreadDefaults {
  colours: string[];
  width: number;
  twistPitch: number;
}

// The in-progress Thread Path while drawing (docs/specs/26-thread-drawing-workflow) —
// transient, non-undoable interaction state; only a committed ThreadPath is undoable.
export type ThreadDraft = { pinIds: string[] } | null;

// docs/specs/32-generator-mode.md — the current Generate/Re-generate result, not yet
// Confirmed. Transient and non-undoable, same shape/rationale as ThreadDraft above:
// Generate/Re-generate freely overwrite it (there's nothing mid-draft to undo back to),
// and only Confirm (which creates real, permanent layers) reaches the undo history.
export type GeneratorDraft = { params: GeneratorParams; pinPaths: PinPath[]; threadPaths: ThreadPath[] } | null;

// docs/specs/33-pin-path-tool.md — the in-progress Path tool draft (click-per-vertex
// free-form polygon). Transient, non-undoable, same treatment as ThreadDraft above:
// only the final commit (a real closed Pin Path) reaches the undo history.
export type PolygonDraft = { points: Point[] } | null;

// docs/specs/35-zigzag-parabolic-tools.md — the in-progress Zig-zag/Parabolic draft.
// Click 1 sets `firstPinId` with `candidates` still empty (awaiting a second pin).
// Click 2 fills `candidates` with every valid resulting pin-id sequence for that pair
// (1 when there's no ambiguity, up to 4 when both an arc/direction choice is open) —
// a single candidate commits immediately without populating the draft further. Once
// 2+ candidates exist, `chosenIndex` tracks whichever the cursor is currently nearest
// (live preview) and a 3rd click commits it. Transient, non-undoable, same treatment
// as ThreadDraft/PolygonDraft above.
export type TwoPinDraft = {
  tool: "zigzag" | "parabolic";
  firstPinId: string;
  candidates: string[][];
  chosenIndex: number;
} | null;

export interface EditorState {
  board: Board;
  mode: EditorMode;
  grid: GridSettings;
  snap: SnapSettings;
  viewport: Viewport;
  pinLayers: PinLayer[];
  activePinLayerId: string;
  pinTool: PinTool;
  pinDefaults: PinDefaults;
  symmetryDefaults: SymmetryConfig;
  selection: Selection;
  selectTool: SelectTool;
  selectGranularity: SelectGranularity;
  threadLayers: ThreadLayer[];
  activeThreadLayerId: string;
  threadTool: ThreadTool;
  threadDefaults: ThreadDefaults;
  threadDraft: ThreadDraft;
  layerPanelTab: "pin" | "thread";
  printSettings: PrintSettings;
  generatorDraft: GeneratorDraft;
  polygonDraft: PolygonDraft;
  twoPinDraft: TwoPinDraft;
}
