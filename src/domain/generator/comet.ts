// docs/specs/32-generator-mode.md Comet pattern — `layers` independent offset-
// alternation passes around one circle of n pins: pass L connects i to i+d for a
// shrinking run of `size` steps, where both the offset `d` and `size` shrink linearly
// by 1 per layer from `distance`/`firstLayerSize`. Layers shrinking together is what
// gives the accumulated result its comet-like tapering "tail" look — simplified to one
// linear shrink mode (a specific reference implementation's two selectable shrink
// modes are not reproduced here, same simplification precedent as this milestone's
// other deliberately-simplified patterns).
export interface CometLayerSequence {
  localIndices: number[];
}

export function cometLayerSequences(n: number, layers: number, firstLayerSize: number, distance: number): CometLayerSequence[] {
  if (n <= 0) throw new Error("n must be positive");
  if (layers <= 0) throw new Error("layers must be positive");
  const result: CometLayerSequence[] = [];
  for (let layer = 0; layer < layers; layer += 1) {
    const d = Math.max(1, distance - layer);
    const size = Math.max(2, firstLayerSize - layer);
    const localIndices: number[] = [];
    for (let i = 0; i < size; i += 1) {
      localIndices.push(i % n);
      localIndices.push((i + d) % n);
    }
    result.push({ localIndices });
  }
  return result;
}
