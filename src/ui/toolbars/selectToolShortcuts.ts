import type { SelectTool } from "../../application/document";

// docs/specs/34-keyboard-shortcuts.md — bare-letter shortcut per Edit-tab tool, shown
// as a "[X]" suffix on each button's label in SelectToolbar.tsx.
export const SELECT_TOOL_SHORTCUT_KEY: Record<SelectTool, string> = {
  select: "S",
  move: "M",
  rotate: "R",
  scale: "C",
};
