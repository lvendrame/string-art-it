import { findPinPath, type Pin, type PinLayer, type PinRef } from "@application/document";

// docs/specs/26-edit-mode-multi-select.md pins granularity — Move/Rotation/Scale need
// to patch only the SELECTED pins within a path's full pins[] array (a partial
// selection leaves the rest of that path's pins untouched, and the path's own
// geometry/spacing metadata untouched too — see the "custom/stale" precedent in
// docs/specs/11-erasers.md). Grouping every selected pin ref by its owning path once,
// up front, is shared by useMoveTool/useRotateTool/useScaleTool's pins-mode branches.
export interface PinGroup {
  layerId: string;
  pathId: string;
  originalPins: Pin[];
  selectedIds: Set<string>;
}

export function buildPinGroups(pinLayers: PinLayer[], refs: PinRef[]): PinGroup[] {
  const groups = new Map<string, PinGroup>();
  for (const r of refs) {
    const key = `${r.layerId}:${r.pathId}`;
    let g = groups.get(key);
    if (!g) {
      const path = findPinPath(pinLayers, r.layerId, r.pathId);
      if (!path) continue;
      g = { layerId: r.layerId, pathId: r.pathId, originalPins: path.pins, selectedIds: new Set() };
      groups.set(key, g);
    }
    g.selectedIds.add(r.pinId);
  }
  return [...groups.values()];
}

// Every original {x,y} for the selected pins across every group, flattened — the input
// to pinsCentroid (docs/specs/26-edit-mode-multi-select.md's always-mean pivot rule).
export function selectedPinsFromGroups(groups: PinGroup[]): Pin[] {
  return groups.flatMap((g) => g.originalPins.filter((p) => g.selectedIds.has(p.id)));
}
