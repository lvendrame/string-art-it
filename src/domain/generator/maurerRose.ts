import type { Point } from "../paths";

// docs/specs/32-generator-mode.md Maurer Rose pattern — the classic public "Maurer
// rose" construction (Peter M. Maurer, 1987): sample a rose curve r = sin(N * theta) at
// theta = k * angleDegrees for k = 0..maxSteps, connecting consecutive samples with
// straight chords. It's a well-known general-purpose parametric curve (not any
// particular string-art app's proprietary algorithm), the same public formula this
// project already documents for Spirals' own curve-sampled construction
// (spiralArms.ts).
export function maurerRosePoints(N: number, maxSteps: number, angleDegrees: number, rotation: number, maxRadius: number, center: Point): Point[] {
  if (N <= 0) throw new Error("N must be positive");
  if (maxSteps <= 0) throw new Error("maxSteps must be positive");
  const points: Point[] = [];
  for (let k = 0; k <= maxSteps; k += 1) {
    const thetaDegrees = k * angleDegrees;
    const theta = (thetaDegrees * Math.PI) / 180;
    const r = maxRadius * Math.sin(N * theta);
    const angle = theta + rotation;
    points.push({ x: center.x + r * Math.cos(angle), y: center.y + r * Math.sin(angle) });
  }
  return points;
}
