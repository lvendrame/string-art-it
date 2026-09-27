import { useEffect, useMemo, useState } from "react";
import { MIN_REPEAT_PINS, type EditorState, type EditorStore } from "@application/document";
import type { Point } from "@domain/paths";
import { isTextEntryTarget } from "@ui/keyboard";
import { nearestThreadInsertionPin } from "./hitTesting";

// docs/specs/38-repeat-pattern-tool.md — each click appends a pin to the Repeat
// draft; Enter generates, Escape cancels, ArrowLeft removes the last pin.
export function useRepeatDrawing(store: EditorStore, state: EditorState) {
  const [hoverPinId, setHoverPinId] = useState<string | null>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const s = store.getState();
      if (s.mode !== "thread" || s.threadTool !== "repeat" || isTextEntryTarget(e.target)) return;
      if (e.key === "Enter") {
        // Enter on a focused button already activates that button.
        if (e.target instanceof HTMLButtonElement) return;
        store.generateRepeatDraft(s.activeThreadLayerId);
      } else if (e.key === "Escape") {
        store.cancelRepeatDraft();
      } else if (e.key === "ArrowLeft") {
        store.retractRepeatDraft();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [store]);

  function handleMouseDown(raw: Point, maxDist: number): void {
    const hit = nearestThreadInsertionPin(state.pinLayers, state.activePinLayerId, raw, maxDist);
    if (hit) store.extendRepeatDraft(hit.pinId);
  }

  function handleMouseMove(raw: Point, maxDist: number): void {
    setHoverPinId(nearestThreadInsertionPin(state.pinLayers, state.activePinLayerId, raw, maxDist)?.pinId ?? null);
  }

  const statusText = useMemo(() => {
    const count = state.repeatDraft?.pinIds.length ?? 0;
    if (count === 0) return hoverPinId ? `Pin ${hoverPinId} — click to start.` : null;
    const usable = count - (count % 2);
    return usable >= MIN_REPEAT_PINS
      ? `${count} pins — press Enter to generate.`
      : `${count} pins — pick at least ${MIN_REPEAT_PINS} (even count).`;
  }, [state.repeatDraft, hoverPinId]);

  return { hoverPinId, handleMouseDown, handleMouseMove, statusText };
}
