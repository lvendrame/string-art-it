import { useEffect, useState } from "react";
import { findPinPath, rotateGeometry, type EditorState, type EditorStore, type Pin, type PinLayer } from "@application/document";
import { rotatePoint } from "@domain/transforms";
import type { Point } from "@domain/paths";
import { buildPinGroups, type PinGroup } from "./pinGroups";

// docs/specs/09-selection-and-editing.md Rotation tool — horizontal-drag-to-angle:
// dragging right increases the angle, left decreases it, in SCREEN pixels (not
// document units), so the feel stays consistent regardless of zoom (mirrors
// usePanInteraction's use of raw clientX).
export const ROTATION_SENSITIVITY_RAD_PER_PX = (0.3 * Math.PI) / 180;

type RotateDrag =
  | { kind: "paths"; pivot: Point; startClientX: number; snapshot: PinLayer[]; paths: { layerId: string; pathId: string; originalPins: Pin[] }[] }
  | { kind: "pins"; pivot: Point; startClientX: number; snapshot: PinLayer[]; groups: PinGroup[] };

// docs/specs/26-edit-mode-multi-select.md — the press point stays the pivot regardless
// of granularity or how many paths/pins are selected (unlike Scale, which pivots on a
// combined/mean centroid); every selected path or pin just rotates about that same
// shared point.
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
    const { selection } = state;
    if (selection.type === "pinPaths" && selection.refs.length > 0) {
      const paths = selection.refs
        .map((r) => {
          const path = findPinPath(state.pinLayers, r.layerId, r.pathId);
          return path ? { layerId: r.layerId, pathId: r.pathId, originalPins: path.pins } : null;
        })
        .filter((x): x is { layerId: string; pathId: string; originalPins: Pin[] } => !!x);
      if (paths.length === 0) return;
      setDrag({ kind: "paths", pivot: point, startClientX: clientX, snapshot: state.pinLayers, paths });
      return;
    }
    if (selection.type === "pins" && selection.refs.length > 0) {
      const groups = buildPinGroups(state.pinLayers, selection.refs);
      if (groups.length === 0) return;
      setDrag({ kind: "pins", pivot: point, startClientX: clientX, snapshot: state.pinLayers, groups });
    }
  }

  function handleMouseMove(_point: Point, clientX: number): void {
    if (!drag) return;
    const theta = (clientX - drag.startClientX) * ROTATION_SENSITIVITY_RAD_PER_PX;
    if (drag.kind === "paths") {
      store.previewPinPaths(
        drag.paths.map((p) => ({ layerId: p.layerId, pathId: p.pathId, pins: p.originalPins.map((pin) => ({ ...pin, ...rotatePoint(pin, drag.pivot, theta) })) })),
      );
    } else {
      store.previewPinPaths(
        drag.groups.map((g) => ({
          layerId: g.layerId,
          pathId: g.pathId,
          pins: g.originalPins.map((pin) => (g.selectedIds.has(pin.id) ? { ...pin, ...rotatePoint(pin, drag.pivot, theta) } : pin)),
        })),
      );
    }
  }

  function handleMouseUp(_point: Point, clientX: number): void {
    if (!drag) return;
    const theta = (clientX - drag.startClientX) * ROTATION_SENSITIVITY_RAD_PER_PX;
    if (drag.kind === "paths") {
      const updates = drag.paths
        .map((p) => {
          const path = findPinPath(drag.snapshot, p.layerId, p.pathId); // geometry untouched by preview, still original
          if (!path) return null;
          return {
            layerId: p.layerId,
            pathId: p.pathId,
            geometry: rotateGeometry(path.geometry, drag.pivot, theta),
            pins: p.originalPins.map((pin) => ({ ...pin, ...rotatePoint(pin, drag.pivot, theta) })),
          };
        })
        .filter((u): u is NonNullable<typeof u> => !!u);
      store.commitPinPathsTransform(updates, drag.snapshot);
    } else {
      const updates = drag.groups.flatMap((g) =>
        [...g.selectedIds].map((pinId) => {
          const original = g.originalPins.find((p) => p.id === pinId)!;
          const moved = rotatePoint(original, drag.pivot, theta);
          return { layerId: g.layerId, pathId: g.pathId, pinId, x: moved.x, y: moved.y };
        }),
      );
      store.commitPinsTransform(updates, drag.snapshot);
    }
    setDrag(null);
  }

  return { isDragging: !!drag, handleMouseDown, handleMouseMove, handleMouseUp };
}
