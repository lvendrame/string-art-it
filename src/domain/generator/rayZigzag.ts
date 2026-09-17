// A generic version of starWeave.ts's starAdjacentSpokeZigzag — the same "connect ray
// point k to a nearby point on a second ray" curve-stitch alternation, but between two
// INDEPENDENT finite point sequences of their own lengths (no shared circle, no
// wraparound modulo), so it isn't tied to the Star pattern's spoke/circle geometry.
// Reused by Polygon (side-to-side), Flower (layered copies of Polygon's own weave), and
// Crosses (line-to-line).
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
