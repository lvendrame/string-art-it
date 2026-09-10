import { createThreadPath, removePinFromThreadPath, type ThreadPath } from "./threadPath";

// docs/specs/13-layers.md — mirrors pinLayer.ts; full layer panel lands at M6.
export interface ThreadLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  threadPaths: ThreadPath[];
}

let layerCounter = 0;
export function createThreadLayer(name: string): ThreadLayer {
  layerCounter += 1;
  return { id: `threadlayer-${layerCounter}`, name, visible: true, locked: false, threadPaths: [] };
}

function findLayer(layers: ThreadLayer[], layerId: string): ThreadLayer | undefined {
  return layers.find((l) => l.id === layerId);
}

export function isThreadLayerLocked(layers: ThreadLayer[], layerId: string): boolean {
  return findLayer(layers, layerId)?.locked ?? false;
}

export function addThreadPathToLayers(layers: ThreadLayer[], layerId: string, threadPath: ThreadPath): ThreadLayer[] {
  return layers.map((l) => (l.id === layerId ? { ...l, threadPaths: [...l.threadPaths, threadPath] } : l));
}

export function removeThreadPathFromLayers(layers: ThreadLayer[], layerId: string, pathId: string): ThreadLayer[] {
  return layers.map((l) => (l.id === layerId ? { ...l, threadPaths: l.threadPaths.filter((p) => p.id !== pathId) } : l));
}

export function findThreadPath(layers: ThreadLayer[], layerId: string, pathId: string): ThreadPath | undefined {
  return findLayer(layers, layerId)?.threadPaths.find((p) => p.id === pathId);
}

let layerDuplicateCounter = 0;
export function duplicateThreadLayer(layer: ThreadLayer): ThreadLayer {
  layerDuplicateCounter += 1;
  return {
    ...layer,
    id: `threadlayer-dup-${layerDuplicateCounter}`,
    name: `${layer.name} copy`,
    threadPaths: layer.threadPaths.map((t) => createThreadPath([...t.pinIds], [...t.colours], t.width, t.twistPitch)),
  };
}

// docs/specs/11-erasers.md cascading deletion — applied across every thread layer at
// once so the caller can fold it into the SAME undo step as the pin removal.
export function removePinFromAllThreadLayers(layers: ThreadLayer[], pinId: string): ThreadLayer[] {
  return layers.map((l) => ({
    ...l,
    threadPaths: l.threadPaths.flatMap((p) => removePinFromThreadPath(p, pinId)),
  }));
}
