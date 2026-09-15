import { useEffect, useState } from "react";
import { findPinPath, translateGeometry, type EditorState, type EditorStore, type Pin, type PinLayer } from "../../application/document";
import { translatePoint } from "../../domain/transforms";
import type { Point } from "../../domain/paths";
import { buildPinGroups, type PinGroup } from "./pinGroups";

type MoveDrag =
  | { kind: "paths"; origin: Point; snapshot: PinLayer[]; paths: { layerId: string; pathId: string; originalPins: Pin[] }[] }
  | { kind: "pins"; origin: Point; snapshot: PinLayer[]; groups: PinGroup[] };

// docs/specs/09-selection-and-editing.md, docs/specs/26-edit-mode-multi-select.md
// Move tool: press-drag-release translation of the current selection (one or more Pin
// Paths, or one or more individual pins), live pin+thread preview, single commit on
// release covering every affected path/pin.
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
    const { selection } = state;
    if (selection.type === "pinPaths" && selection.refs.length > 0) {
      const paths = selection.refs
        .map((r) => {
          const path = findPinPath(state.pinLayers, r.layerId, r.pathId);
          return path ? { layerId: r.layerId, pathId: r.pathId, originalPins: path.pins } : null;
        })
        .filter((x): x is { layerId: string; pathId: string; originalPins: Pin[] } => !!x);
      if (paths.length === 0) return;
      setDrag({ kind: "paths", origin: point, snapshot: state.pinLayers, paths });
      return;
    }
    if (selection.type === "pins" && selection.refs.length > 0) {
      const groups = buildPinGroups(state.pinLayers, selection.refs);
      if (groups.length === 0) return;
      setDrag({ kind: "pins", origin: point, snapshot: state.pinLayers, groups });
    }
  }

  function handleMouseMove(point: Point): void {
    if (!drag) return;
    const delta = { x: point.x - drag.origin.x, y: point.y - drag.origin.y };
    if (drag.kind === "paths") {
      store.previewPinPaths(
        drag.paths.map((p) => ({ layerId: p.layerId, pathId: p.pathId, pins: p.originalPins.map((pin) => ({ ...pin, ...translatePoint(pin, delta) })) })),
      );
    } else {
      store.previewPinPaths(
        drag.groups.map((g) => ({
          layerId: g.layerId,
          pathId: g.pathId,
          pins: g.originalPins.map((pin) => (g.selectedIds.has(pin.id) ? { ...pin, ...translatePoint(pin, delta) } : pin)),
        })),
      );
    }
  }

  function handleMouseUp(point: Point): void {
    if (!drag) return;
    const delta = { x: point.x - drag.origin.x, y: point.y - drag.origin.y };
    if (drag.kind === "paths") {
      const updates = drag.paths
        .map((p) => {
          const path = findPinPath(drag.snapshot, p.layerId, p.pathId); // geometry untouched by preview, still original
          if (!path) return null;
          return {
            layerId: p.layerId,
            pathId: p.pathId,
            geometry: translateGeometry(path.geometry, delta),
            pins: p.originalPins.map((pin) => ({ ...pin, ...translatePoint(pin, delta) })),
          };
        })
        .filter((u): u is NonNullable<typeof u> => !!u);
      store.commitPinPathsTransform(updates, drag.snapshot);
    } else {
      const updates = drag.groups.flatMap((g) =>
        [...g.selectedIds].map((pinId) => {
          const original = g.originalPins.find((p) => p.id === pinId)!;
          const moved = translatePoint(original, delta);
          return { layerId: g.layerId, pathId: g.pathId, pinId, x: moved.x, y: moved.y };
        }),
      );
      store.commitPinsTransform(updates, drag.snapshot);
    }
    setDrag(null);
  }

  return { isDragging: !!drag, handleMouseDown, handleMouseMove, handleMouseUp };
}
