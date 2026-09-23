import type { BoardAppearance } from "@application/document";
import { buildWoodGrainGeometry, type WoodGrainGeometry } from "./woodGrain";

// docs/specs §00 Phase 2 "rich board textures" — expanded preset set.
export const WOOD_PRESETS: Record<string, [string, string, string]> = {
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
export const PAINT_PRESETS: Record<string, [string, string, string]> = {
  sage: ["#9fb08a", "#7d9166", "#5c6e47"],
  slate: ["#7a8a95", "#5e6d78", "#42505a"],
  terracotta: ["#c97a56", "#a85f3f", "#824628"],
  charcoal: ["#5a5a5a", "#404040", "#2a2a2a"],
};

export const PAINT_PRESET_IDS = Object.keys(PAINT_PRESETS);

export function boardFillPaint(id: string, appearance: BoardAppearance): string {
  if (appearance.type === "solid") return appearance.colour;
  return `url(#${id})`;
}

// Plain-string equivalent of WoodGrainPattern (boardFill.tsx), kept structurally
// identical so raster/PDF export renders the same geometry as the live editor SVG.
function woodGrainPatternMarkup(id: string, geometry: WoodGrainGeometry, tint?: string): string {
  const bands = geometry.bands.map((b) => `<path d="${b.d}" fill-rule="evenodd" fill="${b.colour}"/>`).join("");
  const tintRect = tint ? `<rect x="0" y="0" width="1" height="1" fill="${tint}" fill-opacity="0.45"/>` : "";
  return (
    `<pattern id="${id}" patternUnits="objectBoundingBox" patternContentUnits="objectBoundingBox" width="1" height="1">` +
    `${bands}${tintRect}</pattern>`
  );
}

// Plain-string equivalent of BoardFillDefs (boardFill.tsx), for non-React renderers
// (export/print-to-string) that build an SVG document as text rather than a React tree.
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
      const colours = WOOD_PRESETS[appearance.presetId] ?? WOOD_PRESETS.walnut;
      const geometry = buildWoodGrainGeometry(appearance.presetId, colours);
      return woodGrainPatternMarkup(id, geometry);
    }
    case "painted-wood": {
      const colours = PAINT_PRESETS[appearance.presetId] ?? WOOD_PRESETS[appearance.presetId] ?? WOOD_PRESETS.walnut;
      const geometry = buildWoodGrainGeometry(appearance.presetId, colours);
      return woodGrainPatternMarkup(id, geometry, colours[1]);
    }
    case "custom-texture":
      return `<pattern id="${id}" patternUnits="objectBoundingBox" patternContentUnits="objectBoundingBox" width="1" height="1"><image href="${appearance.imageDataUrl}" x="0" y="0" width="1" height="1" preserveAspectRatio="xMidYMid slice"/></pattern>`;
    default:
      return "";
  }
}
