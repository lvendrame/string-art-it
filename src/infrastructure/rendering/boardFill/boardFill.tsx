import type { BoardAppearance } from "../../../application/document";
import { buildWoodGrainGeometry } from "../woodGrain";
import { PAINT_PRESETS, WOOD_PRESETS } from "../boardFillUtils";
import { WoodGrainPattern } from "./WoodGrainPattern";

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
