// docs/specs/32-generator-mode.md Assymetry pattern — one continuous zigzag over a
// COMBINED index space (the circle's `circleCount` pins followed by the spoke's
// `spokeCount` pins, `circleCount + spokeCount` positions total), advancing from a
// start position and walking backward from an end position at the same time, meeting
// in the middle — same "two advancing pointers meeting in the middle" shape as
// rayZigzag.ts's twoRayZigzag, but over one wrapped index space instead of two
// independent rays, which is what lets a single pass cross from the circle onto the
// spoke and back without a hard seam. `startFraction`/`endFraction` (0..1) pick where
// in that combined space the walk starts/ends; `reverse` swaps which end advances
// which direction.
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

  const startIdx = Math.round(startFraction * total);
  const endIdx = Math.round(endFraction * total);
  const steps = Math.max(1, Math.abs(endIdx - startIdx));

  const nodes: AsymmetryNode[] = [];
  for (let k = 0; k <= steps; k += 1) {
    const forward = startIdx + k;
    const backward = endIdx - k;
    nodes.push(toNode(reverse ? backward : forward));
    nodes.push(toNode(reverse ? forward : backward));
  }
  return nodes;
}
