// docs/specs/32-generator-mode.md Wave pattern — a partial-coverage generalization of
// mandala.ts's modular-multiplication traversal (connect i to i*base mod n): instead of
// every layer covering the full ring, each layer only draws `layerFill` of the n
// connections, starting at a rotating offset (`layerSpread` positions per layer). The
// partial arcs land at a different rotation each layer, producing a rippling "wave"
// look instead of Mandala's full concentric coverage — the full-coverage case
// (layerFill===n, layerSpread===0) degenerates back to a single Mandala layer.
export interface WaveLayerSequence {
  localIndices: number[];
}

export function waveLayerSequences(n: number, base: number, layers: number, layerFill: number, layerSpread: number): WaveLayerSequence[] {
  if (n <= 0) throw new Error("n must be positive");
  if (layers <= 0) throw new Error("layers must be positive");
  const fill = Math.min(Math.max(1, layerFill), n);
  return Array.from({ length: layers }, (_, layer) => {
    const shift = (layerSpread * layer) % n;
    const localIndices: number[] = [];
    for (let k = 0; k < fill; k += 1) {
      const i = (k + shift) % n;
      localIndices.push(i);
      localIndices.push((i * base) % n);
    }
    return { localIndices };
  });
}
