// docs/specs/32-generator-mode.md Flower pattern — each polygon side gets its own
// "petal": start by visiting the previous side's, this side's, and the next side's
// own corner (3 one-time anchor visits), then for every inner index alternate an
// advancing boundary point (on this side or the previous side) with a point on a
// dedicated per-side CENTRE spoke (radiating from the board centre out toward this
// side), swapping which boundary side advances each step. The boundary point
// alternates between shrinking-from-the-far-end and growing-from-the-near-end while
// the centre point mirrors it — that back-and-forth against a shared centre anchor is
// what bulges the weave into a petal shape instead of a flat side-to-side envelope.
export type FlowerPetalNode = { which: "prevSide" | "side" | "nextSide" | "centre"; index: number };

export function flowerPetalWeave(nailsPerSide: number): FlowerPetalNode[] {
  if (nailsPerSide < 3) throw new Error("nailsPerSide must be at least 3");
  const nodes: FlowerPetalNode[] = [
    { which: "prevSide", index: 0 },
    { which: "side", index: 0 },
    { which: "nextSide", index: 0 },
  ];
  let alternate = false;
  for (let index = 1; index < nailsPerSide - 1; index += 1) {
    const boundaryA = alternate ? "prevSide" : "side";
    const idxA = alternate ? index : nailsPerSide - index - 1;
    nodes.push({ which: boundaryA, index: idxA });
    nodes.push({ which: "centre", index: nailsPerSide - index - 1 });
    const boundaryB = alternate ? "side" : "prevSide";
    const idxB = alternate ? nailsPerSide - index - 1 : index;
    nodes.push({ which: boundaryB, index: idxB });
    alternate = !alternate;
  }
  return nodes;
}
