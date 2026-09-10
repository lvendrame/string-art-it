import type { BoardAppearance } from "../../application/document";

// docs/specs §00 Phase 2 "rich board textures" — expanded preset set.
const WOOD_PRESETS: Record<string, [string, string, string]> = {
  walnut: ["#8a5a3c", "#6b3f28", "#4a2a1a"],
  oak: ["#c9a06a", "#a97c46", "#7a5730"],
  ash: ["#d8c9a8", "#b8a578", "#8f7c50"],
  cherry: ["#a8543a", "#833f2b", "#5c2c1d"],
  mahogany: ["#6b2f2a", "#4e211d", "#331512"],
  maple: ["#e8d3a3", "#cbb27e", "#a68f5f"],
  ebony: ["#3a332f", "#26211e", "#141110"],
  pine: ["#e3c68f", "#c9a468", "#a9824a"],
};

export const WOOD_PRESET_IDS = Object.keys(WOOD_PRESETS);

// Painted-wood keeps the same grain gradient but tinted toward a chosen paint colour
// (docs/specs/04-board-appearance.md "retain some physical surface texture").
const PAINT_PRESETS: Record<string, [string, string, string]> = {
  sage: ["#9fb08a", "#7d9166", "#5c6e47"],
  slate: ["#7a8a95", "#5e6d78", "#42505a"],
  terracotta: ["#c97a56", "#a85f3f", "#824628"],
  charcoal: ["#5a5a5a", "#404040", "#2a2a2a"],
};

export const PAINT_PRESET_IDS = Object.keys(PAINT_PRESETS);

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
      const [c0, c1, c2] = WOOD_PRESETS[appearance.presetId] ?? WOOD_PRESETS.walnut;
      return (
        <radialGradient id={id} cx="40%" cy="35%" r="75%">
          <stop offset="0%" stopColor={c0} />
          <stop offset="55%" stopColor={c1} />
          <stop offset="100%" stopColor={c2} />
        </radialGradient>
      );
    }
    case "painted-wood": {
      const [c0, c1, c2] = PAINT_PRESETS[appearance.presetId] ?? WOOD_PRESETS[appearance.presetId] ?? WOOD_PRESETS.walnut;
      return (
        <radialGradient id={id} cx="40%" cy="35%" r="75%">
          <stop offset="0%" stopColor={c0} />
          <stop offset="55%" stopColor={c1} />
          <stop offset="100%" stopColor={c2} />
        </radialGradient>
      );
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

export function boardFillPaint(id: string, appearance: BoardAppearance): string {
  if (appearance.type === "solid") return appearance.colour;
  return `url(#${id})`;
}

// Plain-string equivalent of BoardFillDefs, for non-React renderers (export/print-to-
// string) that build an SVG document as text rather than a React tree.
export function boardFillDefsMarkup(id: string, appearance: BoardAppearance): string {
  switch (appearance.type) {
    case "linear-gradient":
      return `<linearGradient id="${id}" gradientTransform="rotate(${appearance.direction})">${appearance.stops
        .map((s) => `<stop offset="${s.offset}%" stop-color="${s.colour}"/>`)
        .join("")}</linearGradient>`;
    case "radial-gradient":
      return `<radialGradient id="${id}" cx="${appearance.centre.x}%" cy="${appearance.centre.y}%">${appearance.stops
        .map((s) => `<stop offset="${s.offset}%" stop-color="${s.colour}"/>`)
        .join("")}</radialGradient>`;
    case "wood-texture": {
      const [c0, c1, c2] = WOOD_PRESETS[appearance.presetId] ?? WOOD_PRESETS.walnut;
      return `<radialGradient id="${id}" cx="40%" cy="35%" r="75%"><stop offset="0%" stop-color="${c0}"/><stop offset="55%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/></radialGradient>`;
    }
    case "painted-wood": {
      const [c0, c1, c2] = PAINT_PRESETS[appearance.presetId] ?? WOOD_PRESETS[appearance.presetId] ?? WOOD_PRESETS.walnut;
      return `<radialGradient id="${id}" cx="40%" cy="35%" r="75%"><stop offset="0%" stop-color="${c0}"/><stop offset="55%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/></radialGradient>`;
    }
    case "custom-texture":
      return `<pattern id="${id}" patternUnits="objectBoundingBox" patternContentUnits="objectBoundingBox" width="1" height="1"><image href="${appearance.imageDataUrl}" x="0" y="0" width="1" height="1" preserveAspectRatio="xMidYMid slice"/></pattern>`;
    default:
      return "";
  }
}
