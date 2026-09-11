import { useEffect, useMemo, useState } from "react";
import { findPinById, type EditorState, type EditorStore } from "../../application/document";
import type { Point } from "../../domain/paths";
import { nearestPinOrMirrorOwner, nearestThreadPath } from "./hitTesting";

// Thread mode drawing workflow (docs/specs/12-thread-editor.md §26-29): click extends
// the draft, double-click/right-click/Esc terminate it in their respective ways.
export function useThreadDrawing(store: EditorStore, state: EditorState, threadLayerId: string, cursorDoc: Point | null) {
  const [threadCandidateId, setThreadCandidateId] = useState<string | null>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (store.getState().mode !== "thread") return;
      if (e.key === "Escape") {
        store.escapeThreadDraft(store.getState().activeThreadLayerId);
      } else if (e.key === "ArrowLeft") {
        store.retractThreadDraft();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [store]);

  function handleMouseDown(raw: Point, maxDist: number): void {
    if (state.threadTool === "eraser") {
      const hit = nearestThreadPath(state.threadLayers, state.pinLayers, raw, maxDist);
      if (hit) store.deleteThreadPath(hit.layerId, hit.pathId);
      return;
    }
    const hit = nearestPinOrMirrorOwner(state.pinLayers, raw, maxDist);
    if (hit) store.extendThreadDraft(hit.pinId);
  }

  function handleMouseMove(raw: Point, maxDist: number): void {
    setThreadCandidateId(nearestPinOrMirrorOwner(state.pinLayers, raw, maxDist)?.pinId ?? null);
  }

  function handleDoubleClick(raw: Point, maxDist: number): void {
    if (state.threadTool !== "draw") return;
    const hit = nearestPinOrMirrorOwner(state.pinLayers, raw, maxDist);
    if (hit) store.finishThreadDraftWithSegment(threadLayerId, hit.pinId);
  }

  function handleContextMenu(): void {
    if (state.threadTool !== "draw") return;
    store.finishThreadDraft(threadLayerId);
  }

  const statusText = useMemo(() => {
    if (!state.threadDraft) {
      // no insertion started yet — still surface the nearest pin under the cursor
      // so its number is known before the user commits to starting the thread.
      return threadCandidateId ? `Pin ${threadCandidateId} — click to start a Thread Path.` : null;
    }
    const lastPinId = state.threadDraft.pinIds[state.threadDraft.pinIds.length - 1];
    const from = findPinById(state.pinLayers, lastPinId);
    if (!from) return null;
    // the origin pin number must show as soon as the draft starts, even before the
    // cursor has moved (no candidate/cursorDoc yet) — see the "From Pin" line below.
    const to = threadCandidateId ? findPinById(state.pinLayers, threadCandidateId) : cursorDoc;
    if (!to) return `From Pin ${lastPinId} — click the next pin to extend.`;
    const segment = Math.hypot(to.x - from.x, to.y - from.y);
    return `From Pin ${lastPinId} → ${threadCandidateId ?? "?"} | Segment: ${segment.toFixed(1)} cm`;
  }, [state.threadDraft, state.pinLayers, threadCandidateId, cursorDoc]);

  return { threadCandidateId, handleMouseDown, handleMouseMove, handleDoubleClick, handleContextMenu, statusText };
}
