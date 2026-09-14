import { useEffect, useState } from "react";
import type { EditorState, EditorStore } from "../../application/document";
import type { Point } from "../../domain/paths";
import { nearestPinOwner } from "./hitTesting";

// docs/specs/09-selection-and-editing.md Merge tool: left-click accumulates real
// pins (toggle to deselect on repeat click); committing >=2 into one new pin is a
// radial-menu action (docs/specs/25-radial-context-menu.md "Commit Merge") rather
// than an instant right-click, so it isn't handled here. Only real, stored pins are
// targetable — a mirror's id doesn't exist in any path's pins[], so it can't be
// merged (same rule as the Pin/Path Erasers).
export function useMergeTool(store: EditorStore, state: EditorState) {
  const [hoverPinId, setHoverPinId] = useState<string | null>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const s = store.getState();
      if (s.mode !== "select" || s.selectTool !== "merge") return;
      if (e.key === "Escape") store.cancelMergeSelection();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [store]);

  // Same targetable set as handleMouseDown (real, stored pins only) so the hover
  // preview never highlights a pin the click itself would refuse to select.
  function handleMouseMove(raw: Point, maxDist: number): void {
    const hit = nearestPinOwner(state.pinLayers, raw, maxDist);
    setHoverPinId(hit?.pinId ?? null);
  }

  function handleMouseDown(raw: Point, maxDist: number): void {
    const hit = nearestPinOwner(state.pinLayers, raw, maxDist);
    if (hit) store.extendMergeSelection(hit);
  }

  return { hoverPinId, handleMouseMove, handleMouseDown };
}
