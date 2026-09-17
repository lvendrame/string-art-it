// docs/specs/32-generator-mode.md Assymetry pattern — one continuous walk over a
// COMBINED, wrapped index space (the circle's `circleCount` pins followed by the
// spoke's `spokeCount` pins, `circleCount + spokeCount` positions total): a pivot
// point advances by a fixed `start` offset every other step, alternating with a
// second pointer that simply counts up from 0 — `toNode(k+start)`, `toNode(k)`,
// `toNode(k+1+start)`, `toNode(k+1)`, … — so each successive chord's far end also
// creeps forward, which is what makes the fan look asymmetric rather than a evenly
// spaced mandala-style ring (that would connect a CONSTANT ratio, not a constant
// offset). Any index that wraps past the circle's own nails lands back among the
// spoke's, which is what lets one continuous pass cross from the circle onto the
// spoke and back without a hard seam. `startFraction`/`endFraction` (0..1) pick where
// in the combined space the walk starts and how many steps it runs; `reverse` walks
// the combined space backward instead of forward.
export type AsymmetryNode = { which: "circle" | "spoke"; index: number };

function wrap(index: number, total: number): number {
  return ((index % total) + total) % total;
}

export function asymmetryZigzag(circleCount: number, spokeCount: number, startFraction: number, endFraction: number, reverse: boolean): AsymmetryNode[] {
  if (circleCount < 1 || spokeCount < 1) throw new Error("circleCount and spokeCount must each be at least 1");
  const total = circleCount + spokeCount;
  const toNode = (globalIndex: number): AsymmetryNode => {
    const i = wrap(globalIndex, total);
    return i < circleCount ? { which: "circle", index: i } : { which: "spoke", index: i - circleCount };
  };
  // In reverse mode the walk counts DOWN from `total` instead of up from 0 — mapped
  // once here, then every later step (including the `+advance` connector below) works
  // directly off that already-mapped value, matching a walk that consistently moves
  // in one direction (down) rather than flipping direction mid-step.
  const getPointIndex = (index: number): number => (reverse ? total - index : index);

  const start = Math.round(startFraction * total);
  const endIndex = Math.max(0, Math.round(endFraction * total) - start);
  const advance = reverse ? -1 : 1;

  const nodes: AsymmetryNode[] = [toNode(getPointIndex(0))];
  let prevPointIndex = getPointIndex(0);
  let isPrevSide = false;

  for (let index = 0; index <= endIndex; index += 1) {
    if (index) {
      nodes.push(toNode(prevPointIndex + advance));
    }
    prevPointIndex = getPointIndex(isPrevSide ? index : index + start);
    nodes.push(toNode(prevPointIndex));
    isPrevSide = !isPrevSide;
  }
  return nodes;
}
