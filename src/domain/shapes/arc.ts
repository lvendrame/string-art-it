import { CircularArcSegment, LineSegment } from "../paths";
import type { Path, Point } from "../paths";

function normalizeAngleDiff(angle: number): number {
  let d = angle % (2 * Math.PI);
  if (d <= -Math.PI) d += 2 * Math.PI;
  if (d > Math.PI) d -= 2 * Math.PI;
  return d;
}

// docs/specs/14-arc-drawing-interaction (source §14): Start + End + Curvature, where
// curvature is the signed sagitta (perpendicular bulge distance from the chord
// midpoint) — the natural quantity a mouse drag produces. curvature 0 degenerates to a
// straight line, matching "moving the pointer adjusts the curvature" continuously
// through zero.
export function arcShape(start: Point, end: Point, curvature: number): Path {
  if (curvature === 0) {
    return { closed: false, segments: [new LineSegment(start, end)] };
  }

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const chord = Math.hypot(dx, dy);
  const mid: Point = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
  const nx = -dy / chord;
  const ny = dx / chord;
  const s = curvature;
  const r = (4 * s * s + chord * chord) / (8 * s);

  const apex: Point = { x: mid.x + nx * s, y: mid.y + ny * s };
  const center: Point = { x: mid.x - nx * (r - s), y: mid.y - ny * (r - s) };
  const radius = Math.abs(r);

  const startAngle = Math.atan2(start.y - center.y, start.x - center.x);
  const endAngle = Math.atan2(end.y - center.y, end.x - center.x);

  const shortSweep = normalizeAngleDiff(endAngle - startAngle);
  const longSweep = shortSweep - Math.sign(shortSweep || 1) * 2 * Math.PI;

  const midOf = (sweep: number) => {
    const a = startAngle + sweep / 2;
    return { x: center.x + radius * Math.cos(a), y: center.y + radius * Math.sin(a) };
  };
  const distToApex = (p: Point) => Math.hypot(p.x - apex.x, p.y - apex.y);
  const sweep = distToApex(midOf(shortSweep)) <= distToApex(midOf(longSweep)) ? shortSweep : longSweep;

  return { closed: false, segments: [new CircularArcSegment(center, radius, startAngle, sweep)] };
}
