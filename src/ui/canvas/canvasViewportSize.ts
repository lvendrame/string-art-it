import { useEffect, useSyncExternalStore, type RefObject } from "react";
import type { EditorStore } from "@application/document";
import type { Point } from "@domain/paths";
import type { Viewport } from "@domain/transforms";

// Live pixel size of the canvas viewport element, measured from its container so the
// board SVG fills all available space. Module-level so non-React callers (Fit, zoom
// anchors) read the same size the SVG renders at.
export type ViewportSize = { width: number; height: number };

const DEFAULT_SIZE: ViewportSize = { width: 720, height: 640 };

let currentSize: ViewportSize = DEFAULT_SIZE;
let measured = false;
const listeners = new Set<() => void>();

export function getCanvasViewportSize(): ViewportSize {
  return currentSize;
}

export function getCanvasViewportCenter(): Point {
  return { x: currentSize.width / 2, y: currentSize.height / 2 };
}

export function setCanvasViewportSize(size: ViewportSize): void {
  if (size.width <= 0 || size.height <= 0) return;
  measured = true;
  if (size.width === currentSize.width && size.height === currentSize.height) return;
  currentSize = size;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useCanvasViewportSize(): ViewportSize {
  return useSyncExternalStore(subscribe, getCanvasViewportSize);
}

export function keepViewportCentered(viewport: Viewport, previous: ViewportSize, next: ViewportSize): Viewport {
  return {
    zoom: viewport.zoom,
    panOrigin: {
      x: viewport.panOrigin.x - (next.width - previous.width) / 2 / viewport.zoom,
      y: viewport.panOrigin.y - (next.height - previous.height) / 2 / viewport.zoom,
    },
  };
}

function readElementSize(element: HTMLElement): ViewportSize {
  const rect = element.getBoundingClientRect();
  return { width: Math.floor(rect.width), height: Math.floor(rect.height) };
}

// Tracks the element's size. The first measurement re-fits the board (the initial fit
// ran before layout, against DEFAULT_SIZE); later resizes keep the view centre fixed.
export function useMeasureCanvasViewport(
  ref: RefObject<HTMLElement | null>,
  store: EditorStore,
  fit: (store: EditorStore) => Viewport,
): void {
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === "undefined") return;

    function applySize(target: HTMLElement) {
      const previous = currentSize;
      const wasMeasured = measured;
      setCanvasViewportSize(readElementSize(target));
      if (!measured) return;
      if (!wasMeasured) store.setViewport(fit(store));
      else if (previous !== currentSize) store.setViewport(keepViewportCentered(store.getState().viewport, previous, currentSize));
    }

    const observer = new ResizeObserver(() => applySize(element));
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, store, fit]);
}
