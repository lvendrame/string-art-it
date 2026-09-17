// docs/specs/32-generator-mode.md Comet pattern — `layers` independent offset-
// alternation passes around one circle of n pins. Layer L's offset `d` shrinks
// linearly from `firstLayerSize` by `layerDistance` per layer (floored at 1); the
// pass then walks `0→d→1→d+1→2→d+2→…` all the way to `n-d`, so its own run length is
// DERIVED from `d` (`n-d+1` steps), not set independently — layers with a smaller `d`
// naturally run longer, which is what gives the accumulated result its tapering
// "comet tail" look (a shrinking offset sweeping a growing arc).
export interface CometLayerSequence {
  localIndices: number[];
}

export function cometLayerSequences(n: number, layers: number, firstLayerSize: number, layerDistance: number): CometLayerSequence[] {
  if (n <= 0) throw new Error("n must be positive");
  if (layers <= 0) throw new Error("layers must be positive");
  const result: CometLayerSequence[] = [];
  for (let layer = 0; layer < layers; layer += 1) {
    const d = Math.min(n - 1, Math.max(1, firstLayerSize - layer * layerDistance));
    const localIndices: number[] = [];
    for (let i = 0; i <= n - d; i += 1) {
      localIndices.push(i % n);
      localIndices.push((i + d) % n);
    }
    result.push({ localIndices });
  }
  return result;
}
