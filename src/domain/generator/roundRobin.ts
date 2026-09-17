// docs/specs/32-generator-mode.md — shared threading primitive for every "composite"
// generator pattern (Star: circle+star; Freestyle: up to 3 circles; Star of David: two
// triangles): visit local pin index `r mod count` of each enabled group in group order,
// for `r` from 0 to the largest group's pin count. Pure index arithmetic, no geometry —
// matches the research finding that all 19 researched patterns thread by index math on
// whatever pins already exist, never by re-deriving geometry mid-traversal.
export interface RoundRobinStep {
  groupIndex: number;
  localIndex: number;
}

export function roundRobinSequence(counts: number[]): RoundRobinStep[] {
  const enabledCounts = counts.filter((c) => c > 0);
  if (enabledCounts.length === 0) return [];
  const rounds = Math.max(...enabledCounts);
  const steps: RoundRobinStep[] = [];
  for (let r = 0; r < rounds; r += 1) {
    counts.forEach((count, groupIndex) => {
      if (count <= 0) return;
      steps.push({ groupIndex, localIndex: r % count });
    });
  }
  return steps;
}
