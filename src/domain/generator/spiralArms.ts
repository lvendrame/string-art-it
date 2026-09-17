import type { Point } from "../paths";

// docs/specs/32-generator-mode.md Spirals pattern — pins sampled along `arms` polar
// curves radiating from a shared centre, matching the researched competitor's Spirals
// generator's point layout (~/projects/pocs/research_string_art/docs/pattern-
// specifications.md §5: "for radial index i, arm s, place at radius=ease(p)·maxRadius,
// angle=rotation+ease(p)·totalAngle+2πs/arms"), simplified to LINEAR easing (`p` used
// directly) rather than the source's configurable easeOut curve — the curve shape only
// changes how the arms bow, not whether pins land on a closed-form parametric curve
// (the property this pattern exists to demonstrate: freehand-as-formula, not freehand-
// as-hand-drawn). `i` starts at 1 (i=0 would place every arm's first point at the exact
// centre, coincident) and runs to `nailsPerSpiral - 1`, so the point count is exactly
// `(nailsPerSpiral - 1) * arms`, generated in (i outer, s inner) order — the same order
// the source traverses sequentially (id 0 -> 1 -> 2 -> ...) to thread the whole spiral
// as one continuous line.
export function spiralArmPoints(params: {
  arms: number;
  nailsPerSpiral: number;
  totalAngleTurns: number;
  rotation: number;
  maxRadius: number;
  center: Point;
}): Point[] {
  const { arms, nailsPerSpiral, totalAngleTurns, rotation, maxRadius, center } = params;
  if (arms <= 0) throw new Error("arms must be positive");
  if (nailsPerSpiral < 2) throw new Error("nailsPerSpiral must be at least 2");
  const points: Point[] = [];
  for (let i = 1; i < nailsPerSpiral; i += 1) {
    const p = i / (nailsPerSpiral - 1);
    const radius = p * maxRadius;
    for (let s = 0; s < arms; s += 1) {
      const angle = rotation + p * totalAngleTurns * 2 * Math.PI + (2 * Math.PI * s) / arms;
      points.push({ x: center.x + radius * Math.cos(angle), y: center.y + radius * Math.sin(angle) });
    }
  }
  return points;
}
