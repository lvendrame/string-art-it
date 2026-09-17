import type { Point } from "../paths";

export interface TileRingTile {
  sides: number;
  center: Point;
  baseRotation: number;
  direction: 1 | -1;
}

// N identical regular-polygon "tiles" evenly arranged around a helper circle of
// `helperRadius`, each tile's own local rotation matching its position angle (so its
// vertex 0 points straight outward) — the general form of Star of David's 6-triangle
// ring (src/application/document/generator/generatorPatterns.ts's buildStarOfDavidTiles
// is the special case tileCount=6, tileSides=3, angleOffset=π/6, always paired with its
// own separate hub tile at the call site, which this fn does not build). Reused
// directly with no hub by Hexagon Spades and Flower of Life.
export function tileRingLayout(
  tileCount: number,
  tileSides: number,
  helperRadius: number,
  angleOffset: number,
  rotation: number,
  center: Point,
  mirrorTiling: boolean,
): TileRingTile[] {
  const tiles: TileRingTile[] = [];
  for (let t = 0; t < tileCount; t += 1) {
    const positionAngle = rotation + angleOffset + (t * 2 * Math.PI) / tileCount - Math.PI / 2;
    const tileCenter: Point = {
      x: center.x + helperRadius * Math.cos(positionAngle),
      y: center.y + helperRadius * Math.sin(positionAngle),
    };
    // Same angular term as positionAngle (minus its vertex-convention -π/2) so each
    // tile's own vertex 0 points straight outward, away from the shared centre.
    const baseRotation = rotation + angleOffset + (t * 2 * Math.PI) / tileCount;
    tiles.push({ sides: tileSides, center: tileCenter, baseRotation, direction: mirrorTiling ? 1 : -1 });
  }
  return tiles;
}
