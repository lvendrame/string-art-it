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

// Nail placement isn't uniform around the circle — nails cluster tightly near the
// comet's own tail direction (angle 0, before `rotation`) and spread out near the
// opposite side. `clusterFraction` is a generic "bias/gain" redistribution curve (the
// public sigmoid family `t^k / (t^k + (1-t)^k)`, k>1 — used broadly in computer
// graphics for exactly this kind of density remap, not specific to this app or any
// one reference): for k>1 its derivative is shallow near t=0 and t=1 (so many equally
// spaced input fractions land close together there — clustering) and steep near
// t=0.5 (so the same equally spaced inputs spread far apart there). `strength` (0..1)
// maps to k=1 (uniform, no remap) through k=5 (strong clustering).
export function clusterFraction(t: number, strength: number): number {
  const k = 1 + Math.max(0, Math.min(1, strength)) * 4;
  if (k === 1) return t;
  const tk = Math.pow(t, k);
  const ttk = Math.pow(1 - t, k);
  return tk / (tk + ttk);
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
