import { canCommitSelectionMerge, type EditorState } from "../../../application/document";

// docs/specs/25-radial-context-menu.md — which slices the radial context menu shows,
// derived purely from EditorState (mode + the relevant sub-state per mode). Kept
// separate from RadialContextMenu.tsx's icon/tooltip/action wiring so the slice-set
// logic (the draft-mode swap, the conditional Merge slice) is unit-testable without
// mounting the menu library.
export type RadialMenuSliceId =
  | "select"
  | "move"
  | "rotate"
  | "scale"
  | "merge"
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
      // docs/specs/26-edit-mode-multi-select.md — Merge is an instant action, not a
      // tool: its slice only appears when there's actually a mergeable (2+ member)
      // selection to fire it against, same gating rule as the toolbar's Merge button.
      const slices: RadialMenuSliceId[] = ["select", "move", "rotate", "scale"];
      if (canCommitSelectionMerge(state.selection)) slices.push("merge");
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
