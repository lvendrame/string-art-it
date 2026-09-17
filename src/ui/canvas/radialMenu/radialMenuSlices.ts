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
    // docs/specs/32-generator-mode.md — Generate/Re-generate/Confirm are explicit
    // GeneratorPanel buttons, not quick canvas gestures; no radial-menu slice set was
    // requested for this mode, so right-click opens an empty (0-slice) menu rather than
    // silently doing nothing or crashing (this switch has no `default`, so every
    // EditorMode must be handled explicitly — found by re-checking every mode-aware
    // switch after adding Generator mode, not just the ones this milestone touched).
    case "generate":
      return [];
  }
}
