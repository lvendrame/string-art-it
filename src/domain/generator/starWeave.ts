// docs/specs/32-generator-mode.md Star pattern — an original per-point connectivity
// design for the "spoke wheel" shape (see generatorPatterns.ts's buildStar): each
// point is woven from THREE interleaved zigzag threads instead of one — two between a
// spoke and its own local arc of circle pins (one sweeping toward each neighbouring
// point, both pivoting on the shared boundary circle pin between them), and one
// directly between two adjacent spokes, bypassing the circle. All three are simple
// alternating walks — the same generic "connect ray point k to a nearby point on a
// second ray" curve-stitch idea used elsewhere in this engine, just interleaved into
// one continuous thread instead of disconnected pairs, which is what a real string
// needs anyway.
export type StarWeaveNode = { kind: "circle"; index: number } | { kind: "spoke"; spoke: number; index: number };

function wrap(index: number, total: number): number {
  return ((index % total) + total) % total;
}

// One spoke's fan against its own local arc of circle pins. `direction` picks which of
// the two mirrored sweeps: +1 walks outward from the spoke's own block boundary
// (pivot = spoke*(sideNails-1)) into HIGHER circle indices; -1 walks the other way,
// into the neighbouring (lower-index) spoke's block. Both pivot on the same shared
// boundary circle pin, which is why every point ends up touching two neighbours' worth
// of circle pins, not just its own dedicated block.
export function starSpokeCircleZigzag(sides: number, sideNails: number, spoke: number, direction: 1 | -1): StarWeaveNode[] {
  if (sideNails < 2) throw new Error("sideNails must be at least 2");
  const totalCircle = sides * (sideNails - 1);
  const pivot = spoke * (sideNails - 1);
  const nodes: StarWeaveNode[] = [{ kind: "circle", index: wrap(direction === 1 ? pivot : pivot + 1, totalCircle) }];
  for (let k = 0; k < sideNails - 1; k += 1) {
    nodes.push({ kind: "spoke", spoke, index: k });
    nodes.push({ kind: "circle", index: wrap(direction === 1 ? pivot + k + 1 : pivot - k, totalCircle) });
  }
  return nodes;
}

// The direct spoke-to-spoke zigzag between two adjacent points, bypassing the circle
// entirely — the third of the three passes.
export function starAdjacentSpokeZigzag(sideNails: number, spokeA: number, spokeB: number): StarWeaveNode[] {
  if (sideNails < 2) throw new Error("sideNails must be at least 2");
  const nodes: StarWeaveNode[] = [{ kind: "spoke", spoke: spokeB, index: sideNails - 1 }];
  for (let k = 0; k < sideNails - 1; k += 1) {
    nodes.push({ kind: "spoke", spoke: spokeA, index: k });
    nodes.push({ kind: "spoke", spoke: spokeB, index: sideNails - 2 - k });
  }
  return nodes;
}
