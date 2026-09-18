// docs/specs/32-generator-mode.md Dance of Planets pattern — NOT a same-index round-
// robin between the two rings (an earlier, structurally wrong assumption — that
// connects a long cross-ring chord on every single step). The real weave mostly
// traces each ring's OWN boundary in short two-point pieces (ring[step] to
// ring[step+1], i.e. an adjacent-index chord hugging that ring's own edge),
// alternating which ring gets the next piece every step — the alternation itself is
// what creates the only cross-ring connections (the jump from one piece's last point
// to the next piece's first point, on the OTHER ring). `reverse` walks ring2's index
// backward instead of forward.
export type DanceOfPlanetsNode = { which: "outer" | "inner"; index: number };

function wrap(index: number, total: number): number {
  return ((index % total) + total) % total;
}

export function danceOfPlanetsWalk(outerCount: number, innerCount: number, rounds: number, reverse: boolean): DanceOfPlanetsNode[] {
  if (outerCount < 1 || innerCount < 1) throw new Error("outerCount and innerCount must each be at least 1");
  if (rounds < 1) throw new Error("rounds must be at least 1");
  const greaterCount = Math.max(outerCount, innerCount);
  const steps = greaterCount * rounds;

  const innerIndex = (step: number): number => {
    if (!reverse) return wrap(step, innerCount);
    const mod = wrap(step, innerCount);
    return wrap(innerCount - (mod === 0 ? innerCount : mod), innerCount);
  };

  const nodes: DanceOfPlanetsNode[] = [{ which: "outer", index: 0 }];
  let toInner = true;
  for (let step = 0; step < steps; step += 1) {
    const index = toInner ? innerIndex(step) : wrap(step, outerCount);
    nodes.push({ which: toInner ? "inner" : "outer", index });
    if (step !== steps - 1) {
      const nextIndex = toInner ? innerIndex(step + 1) : wrap(step + 1, outerCount);
      nodes.push({ which: toInner ? "inner" : "outer", index: nextIndex });
      toInner = !toInner;
    }
  }
  return nodes;
}
