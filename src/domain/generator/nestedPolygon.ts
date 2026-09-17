import type { Point } from "../paths";

// docs/specs/32-generator-mode.md Star of David pattern — the general "nested polygon
// fan" string-art technique: a base polygon copied `depth` times about its own centre,
// each copy shrunk and twisted a little more than the last (spiral-in), with pins at
// every vertex of every copy (no interior side pins) and threads fanning between
// adjacent sides across the whole nested stack. This is what actually produces the
// dense inward spiral/swirl look, not a single flat polygon outline.
export interface NestedPolygonLevel {
  radius: number;
  rotation: number;
}

// `layerAngle` is a dimensionless twist control in (0, 0.5) — larger values twist each
// successive nested copy further and shrink it faster; smaller values keep nested
// copies nearly aligned and close in size. `direction` flips which way the twist spins.
export function nestedPolygonLevels(sides: number, baseRadius: number, baseRotation: number, layerAngle: number, depth: number, direction: 1 | -1): NestedPolygonLevel[] {
  if (sides < 3) throw new Error("sides must be at least 3");
  if (depth < 1) throw new Error("depth must be at least 1");
  const interior = ((sides - 2) * Math.PI) / sides;
  const change = Math.atan((1 - 2 * layerAngle) / Math.tan(interior / 2));
  const innerAngle = Math.PI / sides - change;
  const scale = Math.cos(Math.PI / sides) / Math.cos(change);
  return Array.from({ length: depth }, (_, q) => ({
    radius: baseRadius * scale ** q,
    rotation: baseRotation + direction * innerAngle * q,
  }));
}

// Vertex `s` (0-based, `vertexAt`'s own top-of-circle convention) of nested level `q`,
// flattened level-major so local index `q*sides + s` matches this function's own
// concatenation order — the same convention `connectTwoSidesLocalIndices` below indexes
// into.
export function nestedPolygonVertices(center: Point, sides: number, levels: NestedPolygonLevel[]): Point[] {
  const points: Point[] = [];
  for (const level of levels) {
    for (let s = 0; s < sides; s += 1) {
      const angle = level.rotation + (2 * Math.PI * s) / sides - Math.PI / 2;
      points.push({ x: center.x + level.radius * Math.cos(angle), y: center.y + level.radius * Math.sin(angle) });
    }
  }
  return points;
}

// The "connect two adjacent sides" fan: alternates between side `s` and side
// `(s+1)%sides` across every nested level, flipping visit order each level so the
// thread traces a continuous zig-zag spiral rather than jumping back and forth across
// the whole shape. Returns LOCAL indices into `nestedPolygonVertices`' flattened array
// (`q*sides + s`) — the caller maps these to real pin ids. Length is always `2*depth`
// (so `depth*2 - 1` thread segments once assembled into a Thread Path — the first
// visited nail only anchors the thread, it isn't itself a new segment).
export function connectTwoSidesLocalIndices(sides: number, depth: number, s: number): number[] {
  const next = (s + 1) % sides;
  const indices: number[] = [];
  for (let q = 0; q < depth; q += 1) {
    const sIdx = q * sides + s;
    const nextIdx = q * sides + next;
    if (q % 2 === 0) indices.push(sIdx, nextIdx);
    else indices.push(nextIdx, sIdx);
  }
  return indices;
}
