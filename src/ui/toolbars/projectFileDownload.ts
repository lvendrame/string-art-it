import type { EditorStore } from "@application/document";

// docs/specs/34-keyboard-shortcuts.md — hoisted out of FileMenu.tsx so Ctrl/Cmd+S's
// keyboard handler (useKeyboardShortcuts.ts) triggers the exact same download, not a
// re-implementation of it.
export function saveProjectFile(store: EditorStore): void {
  const file = store.toProjectFile();
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "string-art-project.json";
  a.click();
  URL.revokeObjectURL(url);
}
