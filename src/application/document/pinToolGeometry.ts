import { HEPTAGRAM, OCTAGRAM, PENTAGRAM } from "../../domain/shapes";
import type { Point } from "../../domain/paths";
import type { PinTool } from "./EditorState";
import type { PinPathGeometry } from "./pinPath";

const MIN_SIZE = 0.01;

function normalizeBox(p0: Point, p1: Point) {
  return {
    position: { x: Math.min(p0.x, p1.x), y: Math.min(p0.y, p1.y) },
    width: Math.abs(p1.x - p0.x),
    height: Math.abs(p1.y - p0.y),
  };
}

function radiusFrom(p0: Point, p1: Point): number {
  return Math.max(Math.hypot(p1.x - p0.x, p1.y - p0.y), MIN_SIZE);
}

// Drag-to-create geometry for every tool that isn't Line (2 clicks) or Arc (3-stage —
// see docs/specs/14-arc-drawing-interaction). Bounding-box tools (ellipse/circle/
// rectangle/square) drag from one corner to the opposite; centre-radius tools
// (polygon/star/polygram family) drag from centre outward. `altHeld` is the shape
// constraint modifier (docs/specs/13-shape-constraint-modifier).
export function geometryFromDrag(tool: PinTool, p0: Point, p1: Point, altHeld: boolean): PinPathGeometry | null {
  switch (tool) {
    case "ellipse": {
      const box = normalizeBox(p0, p1);
      let rx = Math.max(box.width / 2, MIN_SIZE);
      let ry = Math.max(box.height / 2, MIN_SIZE);
      if (altHeld) rx = ry = Math.min(rx, ry);
      return { type: "ellipse", center: { x: box.position.x + box.width / 2, y: box.position.y + box.height / 2 }, radiusX: rx, radiusY: ry, rotation: 0 };
    }
    case "circle": {
      const box = normalizeBox(p0, p1);
      const r = Math.max(Math.max(box.width, box.height) / 2, MIN_SIZE);
      return { type: "circle", center: { x: box.position.x + box.width / 2, y: box.position.y + box.height / 2 }, radius: r };
    }
    case "rectangle": {
      const box = normalizeBox(p0, p1);
      let { width, height } = box;
      if (altHeld) width = height = Math.min(width, height);
      return { type: "rectangle", position: box.position, width: Math.max(width, MIN_SIZE), height: Math.max(height, MIN_SIZE), rotation: 0 };
    }
    case "square": {
      const box = normalizeBox(p0, p1);
      const side = Math.max(Math.max(box.width, box.height), MIN_SIZE);
      return { type: "square", position: box.position, side, rotation: 0 };
    }
    case "pentagon":
      return { type: "regular-polygon", center: p0, radius: radiusFrom(p0, p1), sides: 5, rotation: 0 };
    case "hexagon":
      return { type: "regular-polygon", center: p0, radius: radiusFrom(p0, p1), sides: 6, rotation: 0 };
    case "octagon":
      return { type: "regular-polygon", center: p0, radius: radiusFrom(p0, p1), sides: 8, rotation: 0 };
    case "star-5":
    case "star-6":
    case "star-8": {
      const points = tool === "star-5" ? 5 : tool === "star-6" ? 6 : 8;
      const outerRadius = radiusFrom(p0, p1);
      return { type: "star", center: p0, outerRadius, innerRadius: outerRadius * 0.5, points, rotation: 0 };
    }
    case "pentagram":
      return { type: "polygram", center: p0, radius: radiusFrom(p0, p1), points: PENTAGRAM.points, skip: PENTAGRAM.skip, rotation: 0 };
    case "heptagram":
      return { type: "polygram", center: p0, radius: radiusFrom(p0, p1), points: HEPTAGRAM.points, skip: HEPTAGRAM.skip, rotation: 0 };
    case "octagram":
      return { type: "polygram", center: p0, radius: radiusFrom(p0, p1), points: OCTAGRAM.points, skip: OCTAGRAM.skip, rotation: 0 };
    default:
      return null;
  }
}

export const DRAG_TOOLS: PinTool[] = [
  "ellipse", "circle", "rectangle", "square",
  "pentagon", "hexagon", "octagon",
  "star-5", "star-6", "star-8",
  "pentagram", "heptagram", "octagram",
];

// docs/specs/14-arc-drawing-interaction: curvature is the signed sagitta, the
// perpendicular distance of the cursor from the chord midpoint.
export function curvatureFromCursor(start: Point, end: Point, cursor: Point): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const chord = Math.hypot(dx, dy);
  if (chord === 0) return 0;
  const nx = -dy / chord;
  const ny = dx / chord;
  const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
  return (cursor.x - mid.x) * nx + (cursor.y - mid.y) * ny;
}
