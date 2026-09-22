import type { BoardAppearance } from "../../application/document";
import { buildWoodGrainGeometry, type WoodGrainGeometry } from "./woodGrain";
import { PAINT_PRESETS, WOOD_PRESETS } from "./boardFillUtils";

// Growth-ring pattern shared by "wood-texture" and "painted-wood": just the procedural
// noise-banded rings from woodGrain.ts, centred on the board so every ring is complete.
// `tint` (painted-wood only) is a translucent colour rect on top so grain still shows
// through the paint (docs/specs/04-board-appearance.md).
function WoodGrainPattern({
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

// docs/specs/04-board-appearance.md: appearance is independent from pins/threads/
// guides/grid — this module only ever reads `board.appearance`.
export function BoardFillDefs({ id, appearance }: { id: string; appearance: BoardAppearance }) {
  switch (appearance.type) {
    case "linear-gradient":
      return (
        <linearGradient id={id} gradientTransform={`rotate(${appearance.direction})`}>
          {appearance.stops.map((s, i) => (
            <stop key={i} offset={`${s.offset}%`} stopColor={s.colour} />
          ))}
        </linearGradient>
      );
    case "radial-gradient":
      return (
        <radialGradient id={id} cx={`${appearance.centre.x}%`} cy={`${appearance.centre.y}%`}>
          {appearance.stops.map((s, i) => (
            <stop key={i} offset={`${s.offset}%`} stopColor={s.colour} />
          ))}
        </radialGradient>
      );
    case "wood-texture": {
      const colours = WOOD_PRESETS[appearance.presetId] ?? WOOD_PRESETS.walnut;
      const geometry = buildWoodGrainGeometry(appearance.presetId, colours);
      return <WoodGrainPattern id={id} geometry={geometry} />;
    }
    case "painted-wood": {
      const colours = PAINT_PRESETS[appearance.presetId] ?? WOOD_PRESETS[appearance.presetId] ?? WOOD_PRESETS.walnut;
      const geometry = buildWoodGrainGeometry(appearance.presetId, colours);
      return <WoodGrainPattern id={id} geometry={geometry} tint={colours[1]} />;
    }
    case "custom-texture":
      return (
        <pattern id={id} patternUnits="objectBoundingBox" patternContentUnits="objectBoundingBox" width={1} height={1}>
          <image href={appearance.imageDataUrl} x={0} y={0} width={1} height={1} preserveAspectRatio="xMidYMid slice" />
        </pattern>
      );
    default:
      return null;
  }
}
