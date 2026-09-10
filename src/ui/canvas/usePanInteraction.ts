import { useEffect, useState, type MouseEvent as ReactMouseEvent } from "react";
import type { EditorStore } from "../../application/document";
import type { Point } from "../../domain/paths";
import type { Viewport } from "../../domain/transforms";

interface PanStart {
  screenX: number;
  screenY: number;
  origin: Point;
}

// Pan mode drag-to-scroll (docs/specs/06-canvas-and-viewport.md §Pan).
export function usePanInteraction(store: EditorStore) {
  const [panStart, setPanStart] = useState<PanStart | null>(null);

  useEffect(() => {
    if (!panStart) return;
    const onWindowMouseUp = () => setPanStart(null);
    window.addEventListener("mouseup", onWindowMouseUp);
    return () => window.removeEventListener("mouseup", onWindowMouseUp);
  }, [panStart]);

  function begin(e: ReactMouseEvent<SVGSVGElement>, viewport: Viewport): void {
    setPanStart({ screenX: e.clientX, screenY: e.clientY, origin: viewport.panOrigin });
  }

  function update(e: ReactMouseEvent<SVGSVGElement>, viewport: Viewport): void {
    if (!panStart) return;
    const dx = e.clientX - panStart.screenX;
    const dy = e.clientY - panStart.screenY;
    store.setViewport({
      ...viewport,
      panOrigin: { x: panStart.origin.x - dx / viewport.zoom, y: panStart.origin.y - dy / viewport.zoom },
    });
  }

  function end(): void {
    setPanStart(null);
  }

  return { isPanning: !!panStart, begin, update, end };
}
