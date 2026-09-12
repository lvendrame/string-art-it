import type { ThreadLayer } from "./threadLayer";
import type { ThreadPath } from "./threadPath";

// docs/specs/19-play-mode.md — a "frame" is one thread segment (one pinIds[i]->
// pinIds[i+1] edge). Draw order is reconstructed from the CURRENT document structure
// (no timestamp field exists anywhere in the model): thread layers in their current
// array order, each layer's threadPaths in array order (append-only, never reordered),
// each path's pinIds in order. This is an approximation, not a literal edit log —
// reordering layers (a z-order/stacking operation) changes replay order along with it.
export function totalThreadFrames(threadLayers: ThreadLayer[]): number {
  return threadLayers.reduce((sum, l) => sum + l.threadPaths.reduce((s, p) => s + Math.max(p.pinIds.length - 1, 0), 0), 0);
}

// Every path/layer beyond the frame budget is dropped; the path straddling the
// boundary is kept with pinIds sliced to include exactly enough vertices for its
// completed segments so far. Surviving paths keep their id/colours/width/twistPitch —
// only pinIds is ever sliced — so React keys stay stable across frame changes.
export function truncateThreadLayersAtFrame(threadLayers: ThreadLayer[], frame: number): ThreadLayer[] {
  let remaining = Math.max(frame, 0);
  return threadLayers.map((layer) => {
    const paths: ThreadPath[] = [];
    for (const path of layer.threadPaths) {
      if (remaining <= 0) break;
      const segments = Math.max(path.pinIds.length - 1, 0);
      if (remaining >= segments) {
        paths.push(path);
        remaining -= segments;
      } else {
        paths.push({ ...path, pinIds: path.pinIds.slice(0, remaining + 1) });
        remaining = 0;
      }
    }
    return { ...layer, threadPaths: paths };
  });
}
