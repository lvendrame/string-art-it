import { useEffect, useState } from "react";
import type { EditorState, EditorStore, PinPathRef, PinRef } from "../../application/document";
import type { Point } from "../../domain/paths";
import { nearestPinOrMirrorOwner, nearestPinOwner, pinPathsTouchingRect, pinsTouchingRect, type Rect } from "./hitTesting";

// docs/specs/26-edit-mode-multi-select.md — click vs. drag is decided by a small
// SCREEN-pixel movement threshold (not document units), same zoom-independence
// convention as useRotateTool/useScaleTool's clientX-based sensitivity.
const SELECT_DRAG_THRESHOLD_PX = 4;

interface SelectDrag {
  originRaw: Point;
  originClientX: number;
  originClientY: number;
  currentRaw: Point;
  dragging: boolean;
}

// docs/specs/26-edit-mode-multi-select.md Selection Gestures: click (replace),
// Alt/Cmd-click (toggle membership), rubber-band drag (replace with touched set),
// Alt/Cmd-rubber-band (union touched set into existing selection). Granularity
// (`state.selectGranularity`) decides whether a hit/rect resolves to whole Pin Paths
// or individual Pins. Esc cancels an in-progress drag with no store mutation.
export function useSelectTool(store: EditorStore, state: EditorState) {
  const [drag, setDrag] = useState<SelectDrag | null>(null);

  useEffect(() => {
    if (!drag) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setDrag(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [drag]);

  function handleMouseDown(raw: Point, clientX: number, clientY: number): void {
    setDrag({ originRaw: raw, originClientX: clientX, originClientY: clientY, currentRaw: raw, dragging: false });
  }

  function handleMouseMove(raw: Point, clientX: number, clientY: number): void {
    if (!drag) return;
    const screenDist = Math.hypot(clientX - drag.originClientX, clientY - drag.originClientY);
    setDrag({ ...drag, currentRaw: raw, dragging: drag.dragging || screenDist > SELECT_DRAG_THRESHOLD_PX });
  }

  function handleClickPathMode(raw: Point, maxDist: number, altHeld: boolean): void {
    const hit = nearestPinOrMirrorOwner(state.pinLayers, raw, maxDist);
    if (!hit) {
      if (!altHeld) store.select({ type: "none" }); // Alt-click on empty space is a no-op
      return;
    }
    if (!altHeld) {
      store.select({ type: "pinPaths", refs: [{ layerId: hit.layerId, pathId: hit.pathId }] });
      return;
    }
    const current: PinPathRef[] = state.selection.type === "pinPaths" ? state.selection.refs : [];
    const isSelected = current.some((r) => r.layerId === hit.layerId && r.pathId === hit.pathId);
    const next = isSelected
      ? current.filter((r) => !(r.layerId === hit.layerId && r.pathId === hit.pathId))
      : [...current, { layerId: hit.layerId, pathId: hit.pathId }];
    store.select(next.length > 0 ? { type: "pinPaths", refs: next } : { type: "none" });
  }

  function handleClickPinsMode(raw: Point, maxDist: number, altHeld: boolean): void {
    const hit = nearestPinOwner(state.pinLayers, raw, maxDist);
    if (!hit) {
      if (!altHeld) store.select({ type: "none" });
      return;
    }
    if (!altHeld) {
      store.select({ type: "pins", refs: [hit] });
      return;
    }
    const current: PinRef[] = state.selection.type === "pins" ? state.selection.refs : [];
    const isSelected = current.some((r) => r.pinId === hit.pinId);
    const next = isSelected ? current.filter((r) => r.pinId !== hit.pinId) : [...current, hit];
    store.select(next.length > 0 ? { type: "pins", refs: next } : { type: "none" });
  }

  function handleRubberBandPathMode(rect: Rect, altHeld: boolean): void {
    const touched = pinPathsTouchingRect(state.pinLayers, rect);
    if (!altHeld) {
      store.select(touched.length > 0 ? { type: "pinPaths", refs: touched } : { type: "none" });
      return;
    }
    const current: PinPathRef[] = state.selection.type === "pinPaths" ? state.selection.refs : [];
    const merged = [...current];
    for (const t of touched) if (!merged.some((r) => r.layerId === t.layerId && r.pathId === t.pathId)) merged.push(t);
    store.select(merged.length > 0 ? { type: "pinPaths", refs: merged } : { type: "none" });
  }

  function handleRubberBandPinsMode(rect: Rect, altHeld: boolean): void {
    const touched = pinsTouchingRect(state.pinLayers, rect);
    if (!altHeld) {
      store.select(touched.length > 0 ? { type: "pins", refs: touched } : { type: "none" });
      return;
    }
    const current: PinRef[] = state.selection.type === "pins" ? state.selection.refs : [];
    const merged = [...current];
    for (const t of touched) if (!merged.some((r) => r.pinId === t.pinId)) merged.push(t);
    store.select(merged.length > 0 ? { type: "pins", refs: merged } : { type: "none" });
  }

  function handleMouseUp(raw: Point, maxDist: number, altHeld: boolean): void {
    if (!drag) return;
    const isPathMode = state.selectGranularity === "path";
    if (!drag.dragging) {
      if (isPathMode) handleClickPathMode(raw, maxDist, altHeld);
      else handleClickPinsMode(raw, maxDist, altHeld);
    } else {
      const rect: Rect = { x0: drag.originRaw.x, y0: drag.originRaw.y, x1: raw.x, y1: raw.y };
      if (isPathMode) handleRubberBandPathMode(rect, altHeld);
      else handleRubberBandPinsMode(rect, altHeld);
    }
    setDrag(null);
  }

  const dragRect: Rect | null =
    drag && drag.dragging ? { x0: drag.originRaw.x, y0: drag.originRaw.y, x1: drag.currentRaw.x, y1: drag.currentRaw.y } : null;

  return { isDragging: drag?.dragging ?? false, dragRect, handleMouseDown, handleMouseMove, handleMouseUp };
}
