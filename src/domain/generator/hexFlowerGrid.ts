import type { Point } from "@domain/paths";

// docs/specs/32-generator-mode.md Flower of Life pattern — a proper hexagonal grid of
// small triangles, not a fixed 6-tile ring (an earlier, much sparser simplification).
// The hexagon splits into 6 equilateral "wedges" (each a triangle from the centre out
// to one hexagon edge); each wedge is subdivided into a standard triangular lattice of
// `levels` rows from the centre outward, row `r` (0-indexed) containing `2r+1` small
// triangles alternating "up"/"down" orientation — the classic generic equilateral-
// triangle-grid subdivision (unrelated to any specific reference implementation).
// Row `r` having `2r+1` cells means each wedge totals `levels²` cells (sum of the
// first `levels` odd numbers), so all 6 wedges together give exactly `6·levels²`
// cells — the same total this pattern's real name/scale is known for.
export interface HexFlowerCell {
  center: Point;
  rotation: number;
}

export function hexFlowerGrid(levels: number, radius: number, rotation: number, center: Point): HexFlowerCell[] {
  if (levels < 1) throw new Error("levels must be at least 1");
  if (radius <= 0) throw new Error("radius must be positive");
  const cells: HexFlowerCell[] = [];

  for (let wedge = 0; wedge < 6; wedge += 1) {
    const wedgeAngle = rotation + (wedge * Math.PI) / 3;
    const u = { x: Math.cos(wedgeAngle), y: Math.sin(wedgeAngle) };
    const v = { x: Math.cos(wedgeAngle + Math.PI / 3), y: Math.sin(wedgeAngle + Math.PI / 3) };
    const lattice = (i: number, j: number): Point => ({
      x: center.x + ((i * u.x + j * v.x) * radius) / levels,
      y: center.y + ((i * u.y + j * v.y) * radius) / levels,
    });
    const centroid = (a: Point, b: Point, c: Point): Point => ({ x: (a.x + b.x + c.x) / 3, y: (a.y + b.y + c.y) / 3 });

    for (let row = 0; row < levels; row += 1) {
      for (let i = 0; i <= row; i += 1) {
        const j = row - i;
        const p1 = lattice(i, j);
        const p2 = lattice(i + 1, j);
        const p3 = lattice(i, j + 1);
        cells.push({ center: centroid(p1, p2, p3), rotation: wedgeAngle });
        if (i < row) {
          const p4 = lattice(i + 1, j - 1);
          cells.push({ center: centroid(p2, p3, p4), rotation: wedgeAngle + Math.PI });
        }
      }
    }
  }
  return cells;
}
