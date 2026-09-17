// docs/specs/32-generator-mode.md Wave pattern — a partial-coverage generalization of
// the classic "modular multiplication table" traversal (Mandala's own technique, see
// mandala.ts): for each ODD k in the layer's fill range, a 4-point cell
// `k, (k*base mod n), (k*base mod n)+base, k+1` (all shifted by the layer's rotating
// offset) — the trailing `+base` hop is what gives each connection a small extra
// "hook" instead of a single bare chord, producing the characteristic denser,
// brush-stroke table texture instead of a thin one-chord-per-point outline. Each layer
// only covers `layerFill` of the `n` positions, starting at a rotating offset
// (`layerSpread` positions per layer) — the partial arcs landing at a different
// rotation each layer is what produces the rippling "wave" look instead of a full
// mandala's concentric coverage.
export interface WaveLayerSequence {
  localIndices: number[];
}

function wrap(index: number, total: number): number {
  return ((index % total) + total) % total;
}

export function waveLayerSequences(n: number, base: number, layers: number, layerFill: number, layerSpread: number): WaveLayerSequence[] {
  if (n <= 0) throw new Error("n must be positive");
  if (layers <= 0) throw new Error("layers must be positive");
  const fill = Math.min(Math.max(1, layerFill), n);
  return Array.from({ length: layers }, (_, layer) => {
    const shift = layerSpread * layer;
    const localIndices: number[] = [];
    for (let k = 1; k < fill; k += 2) {
      const multiplied = ((k * base) % n) + shift;
      localIndices.push(wrap(k + shift, n));
      localIndices.push(wrap(multiplied, n));
      localIndices.push(wrap(multiplied + base, n));
      localIndices.push(wrap(k + shift + 1, n));
    }
    return { localIndices };
  });
}
