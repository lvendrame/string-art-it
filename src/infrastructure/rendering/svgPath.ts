import { LineSegment, CircularArcSegment, EllipticalArcSegment } from "../../domain/paths";
import type { Path, Point } from "../../domain/paths";

const FULL_TURN_EPSILON = 1e-6;

interface ArcLike {
  sweep: number;
  length(): number;
  pointAtDistance(distance: number): Point;
}

function arcCommand(segment: ArcLike, rx: number, ry: number, rotationDeg: number): string {
  const total = segment.length();
  const isFullTurn = Math.abs(Math.abs(segment.sweep) - 2 * Math.PI) < FULL_TURN_EPSILON;
  const sweepFlag = segment.sweep > 0 ? 1 : 0;

  // SVG's elliptical arc command cannot express a full 360deg turn (start === end is
  // degenerate) — split a full circle/ellipse into two half-turns.
  if (isFullTurn) {
    const mid = segment.pointAtDistance(total / 2);
    const end = segment.pointAtDistance(total);
    return `A ${rx} ${ry} ${rotationDeg} 0 ${sweepFlag} ${mid.x} ${mid.y} A ${rx} ${ry} ${rotationDeg} 0 ${sweepFlag} ${end.x} ${end.y} `;
  }

  const end = segment.pointAtDistance(total);
  const largeArcFlag = Math.abs(segment.sweep) > Math.PI ? 1 : 0;
  return `A ${rx} ${ry} ${rotationDeg} ${largeArcFlag} ${sweepFlag} ${end.x} ${end.y} `;
}

// The one place domain geometry becomes an SVG "d" attribute. Kept in infrastructure/
// rendering (docs/specs/01-architecture.md) so the domain/paths classes stay
// rendering-agnostic — this module reads their public shape, nothing more.
export function pathToSvgD(path: Path): string {
  if (path.segments.length === 0) return "";

  let d = "";
  const start = path.segments[0].pointAtDistance(0);
  d += `M ${start.x} ${start.y} `;

  for (const segment of path.segments) {
    if (segment instanceof LineSegment) {
      d += `L ${segment.end.x} ${segment.end.y} `;
    } else if (segment instanceof CircularArcSegment) {
      d += arcCommand(segment, segment.radius, segment.radius, 0);
    } else if (segment instanceof EllipticalArcSegment) {
      d += arcCommand(segment, segment.radiusX, segment.radiusY, (segment.rotation * 180) / Math.PI);
    }
  }

  if (path.closed) d += "Z";
  return d.trim();
}
