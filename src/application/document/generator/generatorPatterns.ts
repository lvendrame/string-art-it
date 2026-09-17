import { connectTwoSidesLocalIndices, mandalaLayerSequences, nestedPolygonLevels, nestedPolygonVertices, roundRobinSequence, spiralArmPoints } from "../../../domain/generator";
import { spacingForPinCount, type Point } from "../../../domain/paths";
import type { Board } from "../board";
import { createPinPath, geometryToPath, nextPathId, nextPinId, type Pin, type PinPath, type PinPathGeometry, type PinStyle } from "../pinPath";
import { createThreadPath, type ThreadPath } from "../threadPath";
import { NO_SYMMETRY } from "../symmetryConfig";
import type { ThreadDefaults } from "../EditorState";

// docs/specs/32-generator-mode.md — the 5 generator patterns this milestone ships,
// chosen to exercise every engine capability (single-shape modular math, 2-shape and
// N-shape composites, and the curve-sampled/freehand case). The other 14 patterns
// researched in ~/projects/pocs/research_string_art are architecturally identical (same
// registry shape) and are a follow-up milestone, not built here.
export type GeneratorPatternId = "mandala" | "star" | "freestyle" | "star-of-david" | "spirals";

export interface FreestyleCircleParams {
  enabled: boolean;
  nails: number;
  radiusRatio: number; // of the board's max inscribed radius
  centerXRatio: number; // -1..1, of the board's max inscribed radius, offset from board centre
  centerYRatio: number;
}

export type GeneratorParams =
  | { patternId: "mandala"; n: number; base: number; layers: number }
  | { patternId: "star"; circleNails: number; starPoints: number; starOuterRatio: number; starInnerRatio: number; rotation: number }
  | { patternId: "freestyle"; circles: FreestyleCircleParams[] }
  | { patternId: "star-of-david"; depth: number; layerAngle: number; rotation: number; mirrorTiling: boolean }
  | { patternId: "spirals"; arms: number; nailsPerSpiral: number; totalAngleTurns: number; rotation: number };

export interface GeneratorBuildContext {
  center: Point;
  maxRadius: number;
  pinStyle: PinStyle;
  threadDefaults: ThreadDefaults;
}

export interface GeneratorBuildResult {
  pinPaths: PinPath[];
  threadPaths: ThreadPath[];
}

export interface GeneratorPatternDef {
  id: GeneratorPatternId;
  labelKey: string;
  defaultParams: GeneratorParams;
}

// A conservative inscribed-circle radius for whichever board shape is active — generator
// patterns only need pins safely inside the board, not touching its exact edge, so this
// doesn't need to match boardPath's per-shape precision (docs/specs/03-board-
// configuration.md's own shapes already do that for the board outline itself).
export function maxInscribedRadius(board: Board): number {
  const d = board.dimensions;
  switch (board.shape) {
    case "circle":
      return (d.diameter ?? 60) / 2;
    case "oval":
      return Math.min(d.width ?? 60, d.height ?? 40) / 2;
    case "square":
      return (d.side ?? 50) / 2;
    case "rectangle":
      return Math.min(d.width ?? 60, d.height ?? 40) / 2;
    case "triangle":
      return Math.min(d.side ?? d.base ?? 50, d.height ?? 30) / 3;
  }
}

// docs/specs/32-generator-mode.md §Multicolor — the largest number of distinct colours
// a pattern's CURRENT parameters can actually put to use, i.e. how many independent
// Thread Path "runs" it will produce. Mandala's runs are its `layers` (each layer is
// already its own Thread Path, cycling colour[i % paletteLength] — see buildMandala);
// Star of David's are fixed by construction (6 hexagon sides + 6 triangles × 3 sides =
// 24), independent of `depth`/`mirrorTiling`. Star, Freestyle, and Spirals each thread
// as ONE continuous Thread Path (weaving between shapes, or visiting every sampled
// point in sequence) — splitting any of them into independently-coloured runs would
// change what they draw, not just how they're coloured, so they cap at 1: adding a
// second colour there would never be used by anything (see GeneratorPanel, which grows
// its colour palette from a `+` button, disabled once this cap is reached).
export function maxGeneratorColours(params: GeneratorParams): number {
  switch (params.patternId) {
    case "mandala":
      return Math.max(1, params.layers);
    case "star":
    case "freestyle":
    case "spirals":
      return 1;
    case "star-of-david":
      return 24;
  }
}

function circlePerimeter(radius: number): number {
  return 2 * Math.PI * radius;
}

// Vertex-anchored shapes (regular-polygon/star/polygram) distribute pins PER EDGE
// (docs/specs/07-pin-geometry-engine.md §Vertex-Anchored Pin Distribution); every edge
// of the regular shapes this module builds is congruent by construction, so one edge's
// length is enough to derive the spacing that yields an exact nails-per-side count.
function firstEdgeLength(geometry: PinPathGeometry): number {
  const path = geometryToPath(geometry);
  const segment = path.segments[0];
  if (!segment) throw new Error("geometry has no segments");
  return segment.length();
}

function buildMandala(params: Extract<GeneratorParams, { patternId: "mandala" }>, ctx: GeneratorBuildContext): GeneratorBuildResult {
  const geometry: PinPathGeometry = { type: "circle", center: ctx.center, radius: ctx.maxRadius };
  const spacing = spacingForPinCount(circlePerimeter(ctx.maxRadius), params.n);
  const pinPath = createPinPath(geometry, spacing, ctx.pinStyle);
  const layers = mandalaLayerSequences(params.n, params.base, params.layers);
  const palette = ctx.threadDefaults.colours.length > 0 ? ctx.threadDefaults.colours : ["#5b8def"];
  // Cycle each layer's colour through the current thread-defaults palette (usually just
  // 1 colour) so multi-layer results are at least visually distinguishable out of the
  // box; the user can repaint any of them afterward via the Thread Properties panel.
  const threadPaths = layers.map((layer, i) =>
    createThreadPath(
      layer.localIndices.map((idx) => pinPath.pins[idx].id),
      [palette[i % palette.length]],
      ctx.threadDefaults.width,
      ctx.threadDefaults.twistPitch,
    ),
  );
  return { pinPaths: [pinPath], threadPaths };
}

function buildStar(params: Extract<GeneratorParams, { patternId: "star" }>, ctx: GeneratorBuildContext): GeneratorBuildResult {
  const circleGeometry: PinPathGeometry = { type: "circle", center: ctx.center, radius: ctx.maxRadius };
  const circleSpacing = spacingForPinCount(circlePerimeter(ctx.maxRadius), params.circleNails);
  const circlePath = createPinPath(circleGeometry, circleSpacing, ctx.pinStyle);

  const starGeometry: PinPathGeometry = {
    type: "star",
    center: ctx.center,
    outerRadius: ctx.maxRadius * params.starOuterRatio,
    innerRadius: ctx.maxRadius * params.starInnerRatio,
    points: params.starPoints,
    rotation: params.rotation,
  };
  // "starNails" here means nails per star edge (there are 2*points congruent edges),
  // mirroring the app's own Pin Distance convention rather than a raw total — the
  // control the GeneratorPanel exposes for this pattern is circleNails only, so the
  // star side reuses circleNails as a reasonable per-edge default via the same helper.
  const starSpacing = spacingForPinCount(firstEdgeLength(starGeometry), Math.max(2, Math.round(params.circleNails / params.starPoints)));
  const starPath = createPinPath(starGeometry, starSpacing, ctx.pinStyle);

  const sequence = roundRobinSequence([circlePath.pins.length, starPath.pins.length]);
  const paths = [circlePath, starPath];
  const pinIds = sequence.map((s) => paths[s.groupIndex].pins[s.localIndex].id);
  const threadPath = createThreadPath(pinIds, ctx.threadDefaults.colours, ctx.threadDefaults.width, ctx.threadDefaults.twistPitch);
  return { pinPaths: [circlePath, starPath], threadPaths: [threadPath] };
}

function buildFreestyle(params: Extract<GeneratorParams, { patternId: "freestyle" }>, ctx: GeneratorBuildContext): GeneratorBuildResult {
  const enabled = params.circles.filter((c) => c.enabled && c.nails > 0);
  const pinPaths = enabled.map((c) => {
    const center: Point = { x: ctx.center.x + c.centerXRatio * ctx.maxRadius, y: ctx.center.y + c.centerYRatio * ctx.maxRadius };
    const radius = ctx.maxRadius * c.radiusRatio;
    const geometry: PinPathGeometry = { type: "circle", center, radius };
    const spacing = spacingForPinCount(circlePerimeter(radius), c.nails);
    return createPinPath(geometry, spacing, ctx.pinStyle);
  });
  const sequence = roundRobinSequence(pinPaths.map((p) => p.pins.length));
  const pinIds = sequence.map((s) => pinPaths[s.groupIndex].pins[s.localIndex].id);
  const threadPath = createThreadPath(pinIds, ctx.threadDefaults.colours, ctx.threadDefaults.width, ctx.threadDefaults.twistPitch);
  return { pinPaths, threadPaths: pinIds.length >= 2 ? [threadPath] : [] };
}

interface StarOfDavidTile {
  sides: number;
  center: Point;
  baseRotation: number;
  direction: 1 | -1;
}

// Seven tiles — one central hexagon plus six equilateral triangles arranged around it,
// each on its own nested-polygon spiral (docs/specs/32-generator-mode.md). This is the
// actual construction (verified against a real reference render's nail coordinates: the
// outer tip radius equals R0, the central hexagon's own vertex radius is exactly
// R0/√3, and each triangle's centre sits exactly 30° off the nearest hexagon vertex —
// i.e. centred on a hexagon EDGE, not a vertex, which is what makes the six triangles'
// outward tips interleave with the hexagon's own vertices into a proper 6-pointed
// silhouette instead of a flat hexagon outline). NOT two flat overlapping triangles —
// that was this pattern's original (incorrect) implementation, replaced after visual
// comparison against a real reference render showed it wasn't even the right topology,
// let alone the nested-spiral fill.
function buildStarOfDavidTiles(rotation: number, mirrorTiling: boolean, maxRadius: number, center: Point): StarOfDavidTile[] {
  const innerHexRadius = maxRadius / Math.sqrt(3);
  const triangleRadius = maxRadius / 3;
  const helperRadius = innerHexRadius * Math.cos(Math.PI / 6) + triangleRadius / 2; // == 2*maxRadius/3

  const tiles: StarOfDavidTile[] = [{ sides: 6, center, baseRotation: rotation, direction: 1 }];
  for (let t = 0; t < 6; t += 1) {
    // +30° (π/6) so each triangle centres on a hexagon EDGE, not a vertex.
    const positionAngle = rotation + Math.PI / 6 + (t * Math.PI) / 3 - Math.PI / 2;
    const tileCenter: Point = {
      x: center.x + helperRadius * Math.cos(positionAngle),
      y: center.y + helperRadius * Math.sin(positionAngle),
    };
    // Same angular term as positionAngle (minus its vertex-convention -π/2, which
    // buildTilePinPath's own nestedPolygonVertices call re-applies) so the triangle's
    // own vertex 0 points straight outward, away from the shared centre.
    tiles.push({ sides: 3, center: tileCenter, baseRotation: rotation + Math.PI / 6 + (t * Math.PI) / 3, direction: mirrorTiling ? 1 : -1 });
  }
  return tiles;
}

function buildTilePinPath(tile: StarOfDavidTile, baseRadius: number, layerAngle: number, depth: number, ctx: GeneratorBuildContext): PinPath {
  const levels = nestedPolygonLevels(tile.sides, baseRadius, tile.baseRotation, layerAngle, depth, tile.direction);
  const points = nestedPolygonVertices(tile.center, tile.sides, levels);
  const pins: Pin[] = points.map((p) => ({ id: nextPinId(), ...p }));
  return {
    id: nextPathId(),
    geometry: { type: "freehand", points },
    // Representative placeholder, same rationale as Spirals below — a subsequent Pin
    // distance edit re-running distributePins on this freehand geometry needs SOME
    // positive spacing, not an exact one (the real pin positions are already final).
    requestedSpacing: baseRadius / Math.max(1, depth),
    actualSpacing: baseRadius / Math.max(1, depth),
    pins,
    guideVisible: ctx.pinStyle.guideVisible,
    colour: ctx.pinStyle.colour,
    diameter: ctx.pinStyle.diameter,
    symmetry: NO_SYMMETRY,
  };
}

function buildStarOfDavid(params: Extract<GeneratorParams, { patternId: "star-of-david" }>, ctx: GeneratorBuildContext): GeneratorBuildResult {
  const { depth, layerAngle, rotation, mirrorTiling } = params;
  const innerHexRadius = ctx.maxRadius / Math.sqrt(3);
  const triangleRadius = ctx.maxRadius / 3;
  const tiles = buildStarOfDavidTiles(rotation, mirrorTiling, ctx.maxRadius, ctx.center);

  const pinPaths = tiles.map((tile) => buildTilePinPath(tile, tile.sides === 6 ? innerHexRadius : triangleRadius, layerAngle, depth, ctx));

  // One Thread Path per (tile, side) adjacent-side fan — matches this pattern's
  // researched multi-colour default (docs/specs/32-generator-mode.md), so each side of
  // each tile is independently recolourable afterward via the Thread Properties panel.
  // Each run gets ONE colour, cycling through the palette by run index (same rule as
  // Mandala's layers, docs/specs/32-generator-mode.md §Multicolor) — never the whole
  // palette handed to one Thread Path, which would render as a multi-strand TWIST
  // within that single run instead of colouring separate runs differently.
  const palette = ctx.threadDefaults.colours.length > 0 ? ctx.threadDefaults.colours : ["#5b8def"];
  const threadPaths: ThreadPath[] = [];
  tiles.forEach((tile, tileIndex) => {
    const path = pinPaths[tileIndex];
    for (let s = 0; s < tile.sides; s += 1) {
      const localIndices = connectTwoSidesLocalIndices(tile.sides, depth, s);
      const pinIds = localIndices.map((i) => path.pins[i].id);
      threadPaths.push(createThreadPath(pinIds, [palette[threadPaths.length % palette.length]], ctx.threadDefaults.width, ctx.threadDefaults.twistPitch));
    }
  });

  return { pinPaths, threadPaths };
}

// Spirals is the one pattern whose pins are exact parametric-curve samples (docs/specs/
// 32-generator-mode.md) — going through createPinPath/distributePins would silently
// destroy that: for a "freehand" geometry, distributePins arc-length-RESAMPLES the
// points at evenly-spaced intervals (the correct behaviour for an actual hand-drawn
// Freehand Pin Path, wrong here), so the pin count wouldn't match spiralArmPoints' own
// `(nailsPerSpiral - 1) * arms` count and each point would drift off its computed
// radius/angle. The pins are built directly from the computed points instead — still a
// real, normal PinPath (same nextPathId/nextPinId id minting as every other pattern),
// just skipping the distribution step because there is nothing to distribute: the
// points ARE already the desired pin positions.
function buildSpirals(params: Extract<GeneratorParams, { patternId: "spirals" }>, ctx: GeneratorBuildContext): GeneratorBuildResult {
  const points = spiralArmPoints({
    arms: params.arms,
    nailsPerSpiral: params.nailsPerSpiral,
    totalAngleTurns: params.totalAngleTurns,
    rotation: params.rotation,
    maxRadius: ctx.maxRadius,
    center: ctx.center,
  });
  const geometry: PinPathGeometry = { type: "freehand", points };
  const pins: Pin[] = points.map((p) => ({ id: nextPinId(), ...p }));
  const pinPath: PinPath = {
    id: nextPathId(),
    geometry,
    requestedSpacing: ctx.maxRadius / Math.max(1, params.nailsPerSpiral - 1),
    actualSpacing: ctx.maxRadius / Math.max(1, params.nailsPerSpiral - 1),
    pins,
    guideVisible: ctx.pinStyle.guideVisible,
    colour: ctx.pinStyle.colour,
    diameter: ctx.pinStyle.diameter,
    symmetry: NO_SYMMETRY,
  };
  const threadPath = createThreadPath(
    pins.map((p) => p.id),
    ctx.threadDefaults.colours,
    ctx.threadDefaults.width,
    ctx.threadDefaults.twistPitch,
  );
  return { pinPaths: [pinPath], threadPaths: [threadPath] };
}

// A plain English default layer NAME for each pattern (used to seed the two permanent
// layers Confirm creates, e.g. "Generated — Mandala") — deliberately not translated: it
// only seeds an editable text field (`PinLayer.name`/`ThreadLayer.name`), same as this
// app's other hardcoded-English layer defaults ("Layer 1"), never rendered as fixed UI
// chrome. The GeneratorPanel's pattern DROPDOWN is a different concern and uses
// `labelKey` (translated) instead — see docs/conventions/ui-patterns.md.
export const GENERATOR_PATTERN_NAMES: Record<GeneratorPatternId, string> = {
  mandala: "Mandala",
  star: "Star",
  freestyle: "Freestyle",
  "star-of-david": "Star of David",
  spirals: "Spirals",
};

export const GENERATOR_PATTERNS: Record<GeneratorPatternId, GeneratorPatternDef> = {
  mandala: {
    id: "mandala",
    labelKey: "mandala",
    defaultParams: { patternId: "mandala", n: 180, base: 2, layers: 1 },
  },
  star: {
    id: "star",
    labelKey: "star",
    defaultParams: { patternId: "star", circleNails: 120, starPoints: 5, starOuterRatio: 1, starInnerRatio: 0.4, rotation: 0 },
  },
  freestyle: {
    id: "freestyle",
    labelKey: "freestyle",
    defaultParams: {
      patternId: "freestyle",
      circles: [
        { enabled: true, nails: 80, radiusRatio: 0.5, centerXRatio: 0, centerYRatio: -0.5 },
        { enabled: true, nails: 80, radiusRatio: 0.5, centerXRatio: -0.43, centerYRatio: 0.25 },
        { enabled: true, nails: 80, radiusRatio: 0.5, centerXRatio: 0.43, centerYRatio: 0.25 },
      ],
    },
  },
  "star-of-david": {
    id: "star-of-david",
    labelKey: "starOfDavid",
    defaultParams: { patternId: "star-of-david", depth: 10, layerAngle: 0.063, rotation: 0, mirrorTiling: false },
  },
  spirals: {
    id: "spirals",
    labelKey: "spirals",
    defaultParams: { patternId: "spirals", arms: 3, nailsPerSpiral: 80, totalAngleTurns: 0.52, rotation: 0 },
  },
};

// The single dispatch point every build*() function above funnels through — a plain
// switch on the discriminant `patternId` narrows `params` automatically (same style as
// geometryToPath's switch on PinPathGeometry["type"]), so no per-entry closure/cast is
// needed the way GENERATOR_PATTERNS itself (pure metadata: id/labelKey/defaultParams)
// would otherwise require.
export function buildGeneratorPattern(params: GeneratorParams, ctx: GeneratorBuildContext): GeneratorBuildResult {
  switch (params.patternId) {
    case "mandala":
      return buildMandala(params, ctx);
    case "star":
      return buildStar(params, ctx);
    case "freestyle":
      return buildFreestyle(params, ctx);
    case "star-of-david":
      return buildStarOfDavid(params, ctx);
    case "spirals":
      return buildSpirals(params, ctx);
  }
}
