import type { EditorState } from "../../../application/document";

// docs/specs/25-radial-context-menu.md — which slices the radial context menu shows,
// derived purely from EditorState (mode + the relevant sub-state per mode). Kept
// separate from RadialContextMenu.tsx's icon/tooltip/action wiring so the slice-set
// logic (the draft-mode swap, the conditional Commit Merge slice) is unit-testable
// without mounting the menu library.
export type RadialMenuSliceId =
  | "select"
  | "move"
  | "rotate"
  | "scale"
  | "merge"
  | "commitMerge"
  | "pinLine"
  | "pinArc"
  | "pinEllipse"
  | "pinCircle"
  | "pinRectangle"
  | "pinSquare"
  | "pinFreehand"
  | "pinEraser"
  | "pinPathEraser"
  | "threadDraw"
  | "threadEraser"
  | "threadSegment"
  | "threadCut"
  | "threadBack"
  | "threadNext"
  | "panFit"
  | "panZoomIn"
  | "panZoomOut"
  | "playFirst"
  | "playPrevious"
  | "playToggle"
  | "playNext"
  | "playLast";

export function getRadialMenuSliceIds(state: EditorState): RadialMenuSliceId[] {
  switch (state.mode) {
    case "select": {
      const slices: RadialMenuSliceId[] = ["select", "move", "rotate", "scale", "merge"];
      if (state.selectTool === "merge" && state.mergeSelection.length >= 2) slices.push("commitMerge");
      return slices;
    }
    case "pin":
      return ["pinLine", "pinArc", "pinEllipse", "pinCircle", "pinRectangle", "pinSquare", "pinFreehand", "pinEraser", "pinPathEraser"];
    case "thread":
      return state.threadDraft !== null
        ? ["threadCut", "threadBack", "threadNext"]
        : ["threadDraw", "threadEraser", "threadSegment"];
    case "pan":
      return ["panFit", "panZoomIn", "panZoomOut"];
    case "play":
      return ["playFirst", "playPrevious", "playToggle", "playNext", "playLast"];
  }
}
