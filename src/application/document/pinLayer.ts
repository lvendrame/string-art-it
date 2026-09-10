import { clonePinPath, type Pin, type PinPath } from "./pinPath";

// docs/specs/13-layers.md — full layer panel UI lands at M6, but the shape exists from
// M3 so Pin Paths always live inside a layer, never as an unrelated top-level list.
export interface PinLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  pinPaths: PinPath[];
}

let layerCounter = 0;
export function createPinLayer(name: string): PinLayer {
  layerCounter += 1;
  return { id: `pinlayer-${layerCounter}`, name, visible: true, locked: false, pinPaths: [] };
}

function findLayer(layers: PinLayer[], layerId: string): PinLayer | undefined {
  return layers.find((l) => l.id === layerId);
}

export function isLayerLocked(layers: PinLayer[], layerId: string): boolean {
  return findLayer(layers, layerId)?.locked ?? false;
}

export function addPinPathToLayers(layers: PinLayer[], layerId: string, pinPath: PinPath): PinLayer[] {
  return layers.map((l) => (l.id === layerId ? { ...l, pinPaths: [...l.pinPaths, pinPath] } : l));
}

export function removePinPathFromLayers(layers: PinLayer[], layerId: string, pathId: string): PinLayer[] {
  return layers.map((l) => (l.id === layerId ? { ...l, pinPaths: l.pinPaths.filter((p) => p.id !== pathId) } : l));
}

export function updatePinPathInLayers(
  layers: PinLayer[],
  layerId: string,
  pathId: string,
  updater: (path: PinPath) => PinPath,
): PinLayer[] {
  return layers.map((l) =>
    l.id === layerId ? { ...l, pinPaths: l.pinPaths.map((p) => (p.id === pathId ? updater(p) : p)) } : l,
  );
}

// docs/specs/11-erasers.md Pin Eraser — removes one pin from its Pin Path.
export function erasePinFromLayers(layers: PinLayer[], layerId: string, pathId: string, pinId: string): PinLayer[] {
  return updatePinPathInLayers(layers, layerId, pathId, (path) => ({
    ...path,
    pins: path.pins.filter((p) => p.id !== pinId),
  }));
}

export function findPinPath(layers: PinLayer[], layerId: string, pathId: string): PinPath | undefined {
  return findLayer(layers, layerId)?.pinPaths.find((p) => p.id === pathId);
}

let layerDuplicateCounter = 0;
export function duplicatePinLayer(layer: PinLayer): PinLayer {
  layerDuplicateCounter += 1;
  return {
    ...layer,
    id: `pinlayer-dup-${layerDuplicateCounter}`,
    name: `${layer.name} copy`,
    pinPaths: layer.pinPaths.map(clonePinPath),
  };
}

// Threads reference pins by stable ID across the whole document, not by layer
// (docs/specs/02-document-model.md) — so lookup scans every layer/path.
export function findPinById(layers: PinLayer[], pinId: string): Pin | undefined {
  for (const l of layers) {
    for (const p of l.pinPaths) {
      const pin = p.pins.find((x) => x.id === pinId);
      if (pin) return pin;
    }
  }
  return undefined;
}
