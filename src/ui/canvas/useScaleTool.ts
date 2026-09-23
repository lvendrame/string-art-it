import { useEffect, useState } from "react";
import {
  distributePins,
  findPinPath,
  pinsCentroid,
  recomputePinPath,
  scaleGeometryAboutPivot,
  selectionCentroid,
  type EditorState,
  type EditorStore,
  type PinLayer,
  type PinPath,
  type ThreadLayer,
} from "@application/document";
import { scalePoint } from "@domain/transforms";
import type { Point } from "@domain/paths";
import { buildPinGroups, selectedPinsFromGroups, type PinGroup } from "./pinGroups";

// docs/specs/21-scale-and-pin-distance.md Scale tool — horizontal-drag-to-factor, same
// screen-pixel-based feel as useRotateTool's ROTATION_SENSITIVITY_RAD_PER_PX: dragging
// right grows the shape, left shrinks it, independent of zoom. Factor is clamped to a
// small positive minimum so the shape can never invert or collapse to a point.
export const SCALE_SENSITIVITY_PER_PX = 0.004;
export const MIN_SCALE_FACTOR = 0.05;

function factorFromDelta(deltaPx: number): number {
  return Math.max(1 + deltaPx * SCALE_SENSITIVITY_PER_PX, MIN_SCALE_FACTOR);
}

type ScaleDrag =
  | { kind: "paths"; pivot: Point; startClientX: number; snapshot: PinLayer[]; paths: { layerId: string; pathId: string; originalPath: PinPath }[] }
  | { kind: "pins"; pivot: Point; startClientX: number; snapshot: PinLayer[]; groups: PinGroup[] };

// docs/specs/26-edit-mode-multi-select.md — Scale always pivots on a centroid (never
// the press point, unlike Rotation): the single-shape formula when exactly one Pin
// Path is selected (docs/specs/21-scale-and-pin-distance.md, unchanged), the mean of
// every selected path's pins when 2+ paths are selected, or the mean of the selected
// pins themselves in Pins granularity — computed once at gesture start and held fixed
// for the drag, same as the single-path tool this generalizes.
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
    const { selection } = state;
    if (selection.type === "pinPaths" && selection.refs.length > 0) {
      const paths = selection.refs
        .map((r) => {
          const path = findPinPath(state.pinLayers, r.layerId, r.pathId);
          return path ? { layerId: r.layerId, pathId: r.pathId, originalPath: path } : null;
        })
        .filter((x): x is { layerId: string; pathId: string; originalPath: PinPath } => !!x);
      if (paths.length === 0) return;
      const pivot = selectionCentroid(paths.map((p) => p.originalPath));
      setDrag({ kind: "paths", pivot, startClientX: clientX, snapshot: state.pinLayers, paths });
      return;
    }
    if (selection.type === "pins" && selection.refs.length > 0) {
      const groups = buildPinGroups(state.pinLayers, selection.refs);
      if (groups.length === 0) return;
      const pivot = pinsCentroid(selectedPinsFromGroups(groups));
      setDrag({ kind: "pins", pivot, startClientX: clientX, snapshot: state.pinLayers, groups });
    }
  }

  // Live preview only touches `pins` (via previewPinPaths), never `geometry` or Thread
  // Paths — same limitation the single-path tool already has (the guide-line outline
  // in PinPathVisual.tsx renders from `geometry`, which only updates on commit) and the
  // same reason threads aren't reattached mid-drag: that only happens once, on commit.
  function handleMouseMove(clientX: number): void {
    if (!drag) return;
    const factor = factorFromDelta(clientX - drag.startClientX);
    if (drag.kind === "paths") {
      store.previewPinPaths(
        drag.paths.map((p) => {
          const geometry = scaleGeometryAboutPivot(p.originalPath.geometry, drag.pivot, factor);
          const { pins } = distributePins(geometry, p.originalPath.requestedSpacing);
          return { layerId: p.layerId, pathId: p.pathId, pins };
        }),
      );
    } else {
      store.previewPinPaths(
        drag.groups.map((g) => ({
          layerId: g.layerId,
          pathId: g.pathId,
          pins: g.originalPins.map((pin) => (g.selectedIds.has(pin.id) ? { ...pin, ...scalePoint(pin, drag.pivot, factor) } : pin)),
        })),
      );
    }
  }

  function handleMouseUp(clientX: number): void {
    if (!drag) return;
    const factor = factorFromDelta(clientX - drag.startClientX);
    if (drag.kind === "paths") {
      const updates = drag.paths.map((p) => {
        const geometry = scaleGeometryAboutPivot(p.originalPath.geometry, drag.pivot, factor);
        const newPinPath = recomputePinPath({ ...p.originalPath, geometry });
        return { layerId: p.layerId, pathId: p.pathId, newPinPath };
      });
      const previous: { pinLayers: PinLayer[]; threadLayers: ThreadLayer[] } = { pinLayers: drag.snapshot, threadLayers: state.threadLayers };
      store.commitPinPathsScale(updates, previous);
    } else {
      const updates = drag.groups.flatMap((g) =>
        [...g.selectedIds].map((pinId) => {
          const original = g.originalPins.find((p) => p.id === pinId)!;
          const moved = scalePoint(original, drag.pivot, factor);
          return { layerId: g.layerId, pathId: g.pathId, pinId, x: moved.x, y: moved.y };
        }),
      );
      store.commitPinsTransform(updates, drag.snapshot);
    }
    setDrag(null);
  }

  return { isDragging: !!drag, handleMouseDown, handleMouseMove, handleMouseUp };
}
