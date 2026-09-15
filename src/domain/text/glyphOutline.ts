import type { Point } from "../paths";

// A neutral, library-agnostic description of one glyph-outline drawing command —
// deliberately NOT opentype.js's own Path/PathCommand classes, so this module (and the
// rest of domain/) never imports a font-parsing library. The infrastructure layer is
// the only place that talks to opentype.js; it translates opentype's own commands into
// this shape before handing them to the flattener below (docs/plan M22 — Text Pin Path).
export type GlyphCommand =
  | { type: "M"; x: number; y: number }
  | { type: "L"; x: number; y: number }
  | { type: "C"; x1: number; y1: number; x2: number; y2: number; x: number; y: number }
  | { type: "Q"; x1: number; y1: number; x: number; y: number }
  | { type: "Z" };

function cubicPoint(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const mt = 1 - t;
  const a = mt * mt * mt;
  const b = 3 * mt * mt * t;
  const c = 3 * mt * t * t;
  const d = t * t * t;
  return { x: a * p0.x + b * p1.x + c * p2.x + d * p3.x, y: a * p0.y + b * p1.y + c * p2.y + d * p3.y };
}

function quadraticPoint(p0: Point, p1: Point, p2: Point, t: number): Point {
  const mt = 1 - t;
  const a = mt * mt;
  const b = 2 * mt * t;
  const c = t * t;
  return { x: a * p0.x + b * p1.x + c * p2.x, y: a * p0.y + b * p1.y + c * p2.y };
}

const DEFAULT_SEGMENTS_PER_CURVE = 12;

// Flattens a glyph's drawing commands into per-contour point arrays — a letter with a
// hole ("o", "e") or a disconnected piece ("i"'s dot) produces more than one contour.
// Curves are subdivided into a fixed number of straight segments (same fixed-sample-
// density approach as Path.ts's pathBoundingBoxPoints, rather than an adaptive
// algorithm) — plenty smooth at the sizes this app's boards render, and pins are placed
// at real points along this polyline exactly the way Freehand's points already are.
export function commandsToContours(commands: GlyphCommand[], segmentsPerCurve = DEFAULT_SEGMENTS_PER_CURVE): Point[][] {
  const contours: Point[][] = [];
  let current: Point[] = [];
  let cursor: Point = { x: 0, y: 0 };

  const closeCurrentContour = () => {
    if (current.length > 0) contours.push(current);
    current = [];
  };

  for (const command of commands) {
    switch (command.type) {
      case "M":
        closeCurrentContour();
        cursor = { x: command.x, y: command.y };
        current.push(cursor);
        break;
      case "L":
        cursor = { x: command.x, y: command.y };
        current.push(cursor);
        break;
      case "C": {
        const p1 = { x: command.x1, y: command.y1 };
        const p2 = { x: command.x2, y: command.y2 };
        const p3 = { x: command.x, y: command.y };
        for (let i = 1; i <= segmentsPerCurve; i += 1) {
          current.push(cubicPoint(cursor, p1, p2, p3, i / segmentsPerCurve));
        }
        cursor = p3;
        break;
      }
      case "Q": {
        const p1 = { x: command.x1, y: command.y1 };
        const p2 = { x: command.x, y: command.y };
        for (let i = 1; i <= segmentsPerCurve; i += 1) {
          current.push(quadraticPoint(cursor, p1, p2, i / segmentsPerCurve));
        }
        cursor = p2;
        break;
      }
      case "Z":
        closeCurrentContour();
        break;
    }
  }
  closeCurrentContour();

  return contours;
}
