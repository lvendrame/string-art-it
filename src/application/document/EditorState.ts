import type { Viewport } from "../../domain/transforms";
import type { Board } from "./board";
import type { PinLayer } from "./pinLayer";
import type { PinStyle } from "./pinPath";
import type { SymmetryConfig } from "./symmetryConfig";
import type { ThreadLayer } from "./threadLayer";
import type { PrintSettings } from "./printSettings";

// docs/specs/06-canvas-and-viewport.md §Editor Modes
export type EditorMode = "select" | "pin" | "thread" | "pan";

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
  | "eraser";

export type Selection = { type: "none" } | { type: "pinPath"; layerId: string; pathId: string };

export interface PinDefaults extends PinStyle {
  spacing: number;
}

// docs/specs/24-thread-mode
export type ThreadTool = "draw" | "eraser";

export interface ThreadDefaults {
  colours: string[];
  width: number;
  twistPitch: number;
}

// The in-progress Thread Path while drawing (docs/specs/26-thread-drawing-workflow) —
// transient, non-undoable interaction state; only a committed ThreadPath is undoable.
export type ThreadDraft = { pinIds: string[] } | null;

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
  threadLayers: ThreadLayer[];
  activeThreadLayerId: string;
  threadTool: ThreadTool;
  threadDefaults: ThreadDefaults;
  threadDraft: ThreadDraft;
  layerPanelTab: "pin" | "thread";
  printSettings: PrintSettings;
}
