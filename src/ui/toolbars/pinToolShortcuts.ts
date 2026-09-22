import type { PinTool } from "../../application/document";

// docs/specs/34-keyboard-shortcuts.md — bare-letter shortcut per Pin-tab tool, shown
// as a "[X]" suffix on each button's label in PinToolbar.tsx.
export const PIN_TOOL_SHORTCUT_KEY: Partial<Record<PinTool, string>> = {
  line: "L",
  arc: "A",
  ellipse: "E",
  circle: "C",
  rectangle: "R",
  square: "S",
  freehand: "F",
  polygon: "P",
  text: "T",
  eraser: "D",
  "path-eraser": "Q",
};
