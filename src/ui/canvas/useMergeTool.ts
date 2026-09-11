import { useEffect } from "react";
import type { EditorState, EditorStore } from "../../application/document";
import type { Point } from "../../domain/paths";
import { nearestPinOwner } from "./hitTesting";

// docs/specs/09-selection-and-editing.md Merge tool: left-click accumulates real
// pins (toggle to deselect on repeat click), right-click commits >=2 into one new
// pin. Only real, stored pins are targetable — a mirror's id doesn't exist in any
// path's pins[], so it can't be merged (same rule as the Pin/Path Erasers).
export function useMergeTool(store: EditorStore, state: EditorState) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const s = store.getState();
      if (s.mode !== "select" || s.selectTool !== "merge") return;
      if (e.key === "Escape") store.cancelMergeSelection();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [store]);

  function handleMouseDown(raw: Point, maxDist: number): void {
    const hit = nearestPinOwner(state.pinLayers, raw, maxDist);
    if (hit) store.extendMergeSelection(hit);
  }

  function handleContextMenu(): void {
    store.commitMergeSelection();
  }

  return { handleMouseDown, handleContextMenu };
}
