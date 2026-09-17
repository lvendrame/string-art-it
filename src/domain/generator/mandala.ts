// docs/specs/32-generator-mode.md Mandala pattern — the classic "modular multiplication
// table" string-art traversal: for pin i on a ring of n pins, connect it to pin
// `(i*base) mod n`. `layers` repeats the whole table at an angular offset (a rotational
// index shift), each layer becoming its own Thread Path/colour — same "each layer is a
// new colour/run" shape the researched competitor's Mandala.pattern.ts uses (see
// ~/projects/pocs/research_string_art/docs/pattern-specifications.md §3), simplified to
// a single even angular shift per layer rather than that source's odd/even-base branch,
// since the branch only affects which of two visually similar shift conventions is used,
// not whether the pattern is reproducible.
export interface MandalaLayerSequence {
  localIndices: number[];
}

export function mandalaLayerSequences(n: number, base: number, layers: number): MandalaLayerSequence[] {
  if (n <= 0) throw new Error("n must be positive");
  if (layers <= 0) throw new Error("layers must be positive");
  const shiftStep = Math.floor(n / layers);
  return Array.from({ length: layers }, (_, layer) => {
    const shift = shiftStep * layer;
    const localIndices: number[] = [];
    for (let i = 0; i < n; i += 1) {
      localIndices.push((i + shift) % n);
      localIndices.push((((i * base) % n) + shift) % n);
    }
    return { localIndices };
  });
}
