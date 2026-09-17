// A generic version of starWeave.ts's starAdjacentSpokeZigzag — the same "connect ray
// point k to a nearby point on a second ray" curve-stitch alternation, but between two
// INDEPENDENT finite point sequences of their own lengths (no shared circle, no
// wraparound modulo), so it isn't tied to the Star pattern's spoke/circle geometry.
// Reused by Crosses (line-to-line).
export type RayZigzagNode = { which: "A" | "B"; index: number };

export function twoRayZigzag(countA: number, countB: number): RayZigzagNode[] {
  if (countA < 1 || countB < 1) throw new Error("countA and countB must each be at least 1");
  const steps = Math.min(countA, countB);
  const nodes: RayZigzagNode[] = [{ which: "B", index: countB - 1 }];
  for (let k = 0; k < steps - 1; k += 1) {
    nodes.push({ which: "A", index: k });
    nodes.push({ which: "B", index: countB - 2 - k });
  }
  return nodes;
}

// A different two-ray weave: instead of pairing point k on ray A with a REVERSED
// point on ray B, this pairs SAME-index points — the 4-point cell `A_k, B_k, B_{k+1},
// A_{k+1}` repeated for advancing even k — which is what a regular polygon's own
// side-to-side "Bézier" envelope curve actually uses (a chord straight across at each
// shared index k, plus a short hop along each ray to the next index). Reused by
// Polygon (side-to-side) and Flower (layered copies of Polygon's own weave).
export function sameIndexZigzag(countA: number, countB: number): RayZigzagNode[] {
  if (countA < 1 || countB < 1) throw new Error("countA and countB must each be at least 1");
  const count = Math.min(countA, countB);
  const nodes: RayZigzagNode[] = [];
  for (let k = 0; k < count - 1; k += 2) {
    const k1 = Math.min(k + 1, count - 1);
    nodes.push({ which: "A", index: k });
    nodes.push({ which: "B", index: k });
    nodes.push({ which: "B", index: k1 });
    nodes.push({ which: "A", index: k1 });
  }
  return nodes;
}
