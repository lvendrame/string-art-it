import { useEffect, type RefObject } from "react";
import type { EditorStore } from "@application/document";
import { zoomByWheelDelta } from "./zoomSteps";

const LINE_HEIGHT_PX = 16;

function wheelDeltaPx(e: WheelEvent, pageHeightPx: number): number {
  if (e.deltaMode === WheelEvent.DOM_DELTA_LINE) return e.deltaY * LINE_HEIGHT_PX;
  if (e.deltaMode === WheelEvent.DOM_DELTA_PAGE) return e.deltaY * pageHeightPx;
  return e.deltaY;
}

// docs/specs/05-canvas-and-viewport.md §Zoom and Pan — wheel/trackpad zoom anchored
// at the cursor. Attached natively (not React's onWheel) because React registers wheel
// listeners as passive, so preventDefault couldn't stop the page/browser from scrolling
// or pinch-zooming instead.
export function useWheelZoom(targetRef: RefObject<HTMLElement | null>, store: EditorStore): void {
  useEffect(() => {
    const element = targetRef.current;
    if (!element) return;
    const target: HTMLElement = element;
    function onWheel(e: WheelEvent): void {
      if (e.deltaY === 0) return;
      e.preventDefault();
      const rect = target.getBoundingClientRect();
      const anchor = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      store.setViewport(zoomByWheelDelta(store.getState().viewport, wheelDeltaPx(e, rect.height), anchor));
    }
    target.addEventListener("wheel", onWheel, { passive: false });
    return () => target.removeEventListener("wheel", onWheel);
  }, [targetRef, store]);
}
