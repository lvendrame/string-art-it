import { useEffect, useState } from "react";
import { rotateGeometry, type EditorState, type EditorStore, type Pin, type PinLayer } from "../../application/document";
import { rotatePoint } from "../../domain/transforms";
import type { Point } from "../../domain/paths";

// docs/specs/09-selection-and-editing.md Rotation tool — horizontal-drag-to-angle:
// dragging right increases the angle, left decreases it, in SCREEN pixels (not
// document units), so the feel stays consistent regardless of zoom (mirrors
// usePanInteraction's use of raw clientX).
export const ROTATION_SENSITIVITY_RAD_PER_PX = (0.3 * Math.PI) / 180;

interface RotateDrag {
  layerId: string;
  pathId: string;
  pivot: Point;
  startClientX: number;
  snapshot: PinLayer[];
  originalPins: Pin[];
}

export function useRotateTool(store: EditorStore, state: EditorState) {
  const [drag, setDrag] = useState<RotateDrag | null>(null);

  // No window-level mouseup safety net — see the identical note in useMoveTool.ts.
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

  function handleMouseDown(point: Point, clientX: number): void {
    if (state.selection.type !== "pinPath") return;
    const { layerId, pathId } = state.selection;
    const path = store.getSelectedPinPath();
    if (!path) return;
    setDrag({ layerId, pathId, pivot: point, startClientX: clientX, snapshot: state.pinLayers, originalPins: path.pins });
  }

  function handleMouseMove(_point: Point, clientX: number): void {
    if (!drag) return;
    const theta = (clientX - drag.startClientX) * ROTATION_SENSITIVITY_RAD_PER_PX;
    store.previewPinPathPins(drag.layerId, drag.pathId, drag.originalPins.map((p) => ({ ...p, ...rotatePoint(p, drag.pivot, theta) })));
  }

  function handleMouseUp(_point: Point, clientX: number): void {
    if (!drag) return;
    const theta = (clientX - drag.startClientX) * ROTATION_SENSITIVITY_RAD_PER_PX;
    const path = store.getSelectedPinPath(); // geometry untouched by preview, still original
    if (path) {
      const pins = drag.originalPins.map((p) => ({ ...p, ...rotatePoint(p, drag.pivot, theta) }));
      store.commitPinPathTransform(drag.layerId, drag.pathId, rotateGeometry(path.geometry, drag.pivot, theta), pins, drag.snapshot);
    }
    setDrag(null);
  }

  return { isDragging: !!drag, handleMouseDown, handleMouseMove, handleMouseUp };
}
