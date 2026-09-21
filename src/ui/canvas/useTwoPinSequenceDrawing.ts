import { useEffect, useMemo, useState } from "react";
import { findPinById, type EditorState, type EditorStore } from "../../application/document";
import type { Point } from "../../domain/paths";
import { nearestThreadInsertionPin } from "./hitTesting";

function isTwoPinTool(tool: EditorState["threadTool"]): tool is "zigzag" | "parabolic" {
  return tool === "zigzag" || tool === "parabolic";
}

// docs/specs/35-zigzag-parabolic-tools.md — Zig-zag/Parabolic click workflow: click 1
// sets the anchor pin, click 2 picks the second pin and computes every valid resulting
// sequence, and — only when that leaves 2+ candidates to choose between (an ambiguous
// arc/direction) — a 3rd, free-position click confirms whichever candidate the cursor
// is currently nearest. A single candidate commits immediately on click 2, same as the
// Arc tool's "no 3rd click needed" case when there's nothing to disambiguate.
export function useTwoPinSequenceDrawing(store: EditorStore, state: EditorState, threadLayerId: string) {
  // The pin currently under the cursor, whenever a PIN (not a candidate sequence) is
  // what's being picked next — before click 1 (which pin would become the anchor) and
  // between clicks 1 and 2 (which pin would become the second pin). Null once 2+
  // candidates exist, since the cursor is then picking a SEQUENCE via nearest far
  // endpoint (see handleMouseMove below), not a pin — same "Candidate highlight applies
  // even with no active draft" precedent PinHighlightOverlay already documents for
  // Thread Draw.
  const [hoverPinId, setHoverPinId] = useState<string | null>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const s = store.getState();
      if (s.mode !== "thread" || !isTwoPinTool(s.threadTool)) return;
      if (e.key === "Escape") {
        store.cancelTwoPinDraft();
      } else if (e.key === "ArrowLeft") {
        store.retractTwoPinDraft();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [store]);

  function handleMouseDown(raw: Point, maxDist: number): void {
    if (!isTwoPinTool(state.threadTool)) return;
    const draft = state.twoPinDraft;

    // 3rd click: a free-position click confirms whichever candidate is previewed —
    // it doesn't need to land on a pin, matching the Arc tool's bulge-side click.
    if (draft && draft.candidates.length > 0) {
      store.resolveTwoPinDraft(threadLayerId);
      return;
    }

    const hit = nearestThreadInsertionPin(state.pinLayers, state.activePinLayerId, raw, maxDist);
    if (!hit) return;
    if (!draft) {
      store.startTwoPinDraft(state.threadTool, hit.pinId);
      return;
    }
    store.chooseSecondPin(threadLayerId, hit.pinId);
  }

  function handleMouseMove(raw: Point, maxDist: number): void {
    const draft = state.twoPinDraft;

    // No draft yet, or awaiting the second pin: surface the nearest pin under the
    // cursor — same shape as useThreadDrawing's own pre-draft/mid-draft candidate.
    if (!draft || draft.candidates.length === 0) {
      setHoverPinId(nearestThreadInsertionPin(state.pinLayers, state.activePinLayerId, raw, maxDist)?.pinId ?? null);
      return;
    }

    setHoverPinId(null);
    // Nearest-candidate-by-far-endpoint: cheap and, since candidates mostly differ by
    // which arc/direction was taken, a good proxy for "which one is the cursor over."
    let bestIndex = draft.chosenIndex;
    let bestDist = Infinity;
    draft.candidates.forEach((sequence, i) => {
      const last = findPinById(state.pinLayers, sequence[sequence.length - 1]);
      if (!last) return;
      const d = Math.hypot(last.x - raw.x, last.y - raw.y);
      if (d < bestDist) {
        bestDist = d;
        bestIndex = i;
      }
    });
    if (bestIndex !== draft.chosenIndex) store.setTwoPinChosenCandidate(bestIndex);
  }

  const statusText = useMemo(() => {
    const draft = state.twoPinDraft;
    if (!draft) {
      // no draft started yet — still surface the nearest pin under the cursor so its
      // id is known before the user commits to starting the draft.
      return hoverPinId ? `Pin ${hoverPinId} — click to start.` : null;
    }
    if (draft.candidates.length === 0) {
      return hoverPinId ? `From Pin ${draft.firstPinId} → ${hoverPinId} — click to compute.` : `From Pin ${draft.firstPinId} — click the second pin.`;
    }
    return `${draft.candidates.length} candidates — click anywhere to confirm the previewed one.`;
  }, [state.twoPinDraft, hoverPinId]);

  return { hoverPinId, handleMouseDown, handleMouseMove, statusText };
}
