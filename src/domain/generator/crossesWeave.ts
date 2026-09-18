// Crosses' own zigzag between one spine segment and its adjacent row's two arm
// lines (source-derived from Crosses.pattern.ts's `connectLines`: an initial
// goto on the left arm's own nail 0, then per index `i` an alternating
// left/right arm nail followed by the spine nail, the spine index counting
// down (`n-1-i`) unless `isReverse` counts it up (`i`) instead — the side
// alternates left/right every step, starting right). Yields exactly `3n`
// nodes (`3n-1` connecting segments), matching the source's own step count.
export type CrossesWeaveNode = { which: "left" | "right" | "spine"; index: number };

export function crossesWeave(nailsPerLine: number, isReverse: boolean): CrossesWeaveNode[] {
  const n = Math.max(1, nailsPerLine);
  const nodes: CrossesWeaveNode[] = [{ which: "left", index: 0 }];
  let side: "left" | "right" = "right";
  for (let i = 0; i < n; i += 1) {
    if (i > 0) nodes.push({ which: side, index: i });
    nodes.push({ which: "spine", index: isReverse ? i : n - 1 - i });
    side = i % 2 === 0 ? "right" : "left";
    nodes.push({ which: side, index: i });
  }
  return nodes;
}
