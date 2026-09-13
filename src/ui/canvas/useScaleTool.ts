import { useEffect, useState } from "react";
import {
  distributePins,
  recomputePinPath,
  scaleGeometry,
  type EditorState,
  type EditorStore,
  type PinLayer,
  type PinPath,
  type ThreadLayer,
} from "../../application/document";

// docs/specs/21-scale-and-pin-distance.md Scale tool — horizontal-drag-to-factor, same
// screen-pixel-based feel as useRotateTool's ROTATION_SENSITIVITY_RAD_PER_PX: dragging
// right grows the shape, left shrinks it, independent of zoom. Factor is clamped to a
// small positive minimum so the shape can never invert or collapse to a point.
export const SCALE_SENSITIVITY_PER_PX = 0.004;
export const MIN_SCALE_FACTOR = 0.05;

function factorFromDelta(deltaPx: number): number {
  return Math.max(1 + deltaPx * SCALE_SENSITIVITY_PER_PX, MIN_SCALE_FACTOR);
}

interface ScaleDrag {
  layerId: string;
  pathId: string;
  startClientX: number;
  snapshot: PinLayer[];
  originalPath: PinPath;
}

export function useScaleTool(store: EditorStore, state: EditorState) {
  const [drag, setDrag] = useState<ScaleDrag | null>(null);

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

  function handleMouseDown(clientX: number): void {
    if (state.selection.type !== "pinPath") return;
    const { layerId, pathId } = state.selection;
    const path = store.getSelectedPinPath();
    if (!path) return;
    setDrag({ layerId, pathId, startClientX: clientX, snapshot: state.pinLayers, originalPath: path });
  }

  // Live preview only touches `pins` (via previewPinPathPins), never `geometry` or
  // Thread Paths — same limitation Move/Rotation already have (the guide-line outline
  // in PinPathVisual.tsx renders from `geometry`, which only updates on commit) and the
  // same reason threads aren't reattached mid-drag: that only happens once, on commit.
  function handleMouseMove(clientX: number): void {
    if (!drag) return;
    const factor = factorFromDelta(clientX - drag.startClientX);
    const geometry = scaleGeometry(drag.originalPath.geometry, factor);
    const { pins } = distributePins(geometry, drag.originalPath.requestedSpacing);
    store.previewPinPathPins(drag.layerId, drag.pathId, pins);
  }

  function handleMouseUp(clientX: number): void {
    if (!drag) return;
    const factor = factorFromDelta(clientX - drag.startClientX);
    const geometry = scaleGeometry(drag.originalPath.geometry, factor);
    const newPinPath = recomputePinPath({ ...drag.originalPath, geometry });
    const previous: { pinLayers: PinLayer[]; threadLayers: ThreadLayer[] } = {
      pinLayers: drag.snapshot,
      threadLayers: state.threadLayers,
    };
    store.commitPinPathScale(drag.layerId, drag.pathId, newPinPath, previous);
    setDrag(null);
  }

  return { isDragging: !!drag, handleMouseDown, handleMouseMove, handleMouseUp };
}
