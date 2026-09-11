import { useEffect, useState } from "react";
import { translateGeometry, type EditorState, type EditorStore, type Pin, type PinLayer } from "../../application/document";
import { translatePoint } from "../../domain/transforms";
import type { Point } from "../../domain/paths";

interface MoveDrag {
  layerId: string;
  pathId: string;
  origin: Point;
  snapshot: PinLayer[];
  originalPins: Pin[];
}

// docs/specs/09-selection-and-editing.md Move tool: press-drag-release translation of
// the selected Pin Path, live pin+thread preview, single commit on release.
export function useMoveTool(store: EditorStore, state: EditorState) {
  const [drag, setDrag] = useState<MoveDrag | null>(null);

  // No window-level mouseup safety net (unlike usePanInteraction) — a mouseup on the
  // SVG bubbles to window too, which would re-fire an "abort" right after the SVG's
  // own onMouseUp already committed. usePinDrawing's drag tools have the same gap
  // (releasing outside the canvas just never completes the gesture) — Esc is the only
  // other way to abort, matching that precedent.
  useEffect(() => {
    if (!drag) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        store.restorePinLayers(drag!.snapshot);
        setDrag(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [drag, store]);

  function handleMouseDown(point: Point): void {
    if (state.selection.type !== "pinPath") return;
    const { layerId, pathId } = state.selection;
    const path = store.getSelectedPinPath();
    if (!path) return;
    setDrag({ layerId, pathId, origin: point, snapshot: state.pinLayers, originalPins: path.pins });
  }

  function handleMouseMove(point: Point): void {
    if (!drag) return;
    const delta = { x: point.x - drag.origin.x, y: point.y - drag.origin.y };
    store.previewPinPathPins(drag.layerId, drag.pathId, drag.originalPins.map((p) => ({ ...p, ...translatePoint(p, delta) })));
  }

  function handleMouseUp(point: Point): void {
    if (!drag) return;
    const delta = { x: point.x - drag.origin.x, y: point.y - drag.origin.y };
    const path = store.getSelectedPinPath(); // geometry untouched by preview, still original
    if (path) {
      const pins = drag.originalPins.map((p) => ({ ...p, ...translatePoint(p, delta) }));
      store.commitPinPathTransform(drag.layerId, drag.pathId, translateGeometry(path.geometry, delta), pins, drag.snapshot);
    }
    setDrag(null);
  }

  return { isDragging: !!drag, handleMouseDown, handleMouseMove, handleMouseUp };
}
