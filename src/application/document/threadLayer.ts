import { createThreadPath, removePinFromThreadPath, splitThreadPathAtSegment, type ThreadPath } from "./threadPath";
import { nextId } from "./idCounter";

// docs/specs/13-layers.md — mirrors pinLayer.ts; full layer panel lands at M6.
export interface ThreadLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  threadPaths: ThreadPath[];
}

export function createThreadLayer(name: string): ThreadLayer {
  return { id: nextId("threadlayer"), name, visible: true, locked: false, threadPaths: [] };
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

export function duplicateThreadLayer(layer: ThreadLayer): ThreadLayer {
  return {
    ...layer,
    id: nextId("threadlayer-dup"),
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

// docs/specs/11-erasers.md Segment Eraser — replaces one Thread Path with its split
// fragments inside a single layer.
export function splitThreadPathInLayer(layers: ThreadLayer[], layerId: string, pathId: string, segmentIndex: number): ThreadLayer[] {
  return layers.map((l) =>
    l.id === layerId
      ? { ...l, threadPaths: l.threadPaths.flatMap((p) => (p.id === pathId ? splitThreadPathAtSegment(p, segmentIndex) : [p])) }
      : l,
  );
}
