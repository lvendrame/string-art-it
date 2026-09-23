import type { WoodGrainGeometry } from "../woodGrain";

// Growth-ring pattern shared by "wood-texture" and "painted-wood": just the procedural
// noise-banded rings from woodGrain.ts, centred on the board so every ring is complete.
// `tint` (painted-wood only) is a translucent colour rect on top so grain still shows
// through the paint (docs/specs/04-board-appearance.md).
export function WoodGrainPattern({
  id,
  geometry,
  tint,
}: {
  id: string;
  geometry: WoodGrainGeometry;
  tint?: string;
}) {
  return (
    <pattern id={id} patternUnits="objectBoundingBox" patternContentUnits="objectBoundingBox" width={1} height={1}>
      {geometry.bands.map((b, i) => (
        <path key={`band-${i}`} d={b.d} fillRule="evenodd" fill={b.colour} />
      ))}
      {tint && <rect x={0} y={0} width={1} height={1} fill={tint} fillOpacity={0.45} />}
    </pattern>
  );
}
