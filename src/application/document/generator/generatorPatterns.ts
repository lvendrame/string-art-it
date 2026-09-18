import {
  asymmetryZigzag,
  clusterFraction,
  cometLayerSequences,
  crossesWeave,
  danceOfPlanetsWalk,
  flowerPetalWeave,
  hexFlowerGrid,
  connectTwoSidesLocalIndices,
  lotusCenterCirclePoint,
  lotusColourGroupCount,
  lotusDrawPatch,
  lotusFit,
  lotusGeneratePatches,
  lotusMaxCenterRadius,
  lotusPatchColorIndex,
  lotusPetalCenter,
  lotusPetalPoint,
  lotusRemovedSectionsCount,
  lotusSectionsCount,
  mandalaLayerSequences,
  maurerRosePoints,
  nestedPolygonLevels,
  nestedPolygonVertices,
  roundRobinSequence,
  spiralArmPoints,
  spiralDecayingWalk,
  starAdjacentSpokeZigzag,
  starSpokeCircleZigzag,
  tileRingLayout,
  sameIndexZigzag,
  waveLayerSequences,
  type AsymmetryNode,
  type CrossesWeaveNode,
  type FlowerPetalNode,
  type LotusNode,
  type RayZigzagNode,
  type TileRingTile,
} from "../../../domain/generator";
import { spacingForPinCount, type Point } from "../../../domain/paths";
import type { Board } from "../board";
import { createPinPath, nextPathId, nextPinId, type Pin, type PinPath, type PinPathGeometry, type PinStyle } from "../pinPath";
import { createThreadPath, type ThreadPath } from "../threadPath";
import { NO_SYMMETRY } from "../symmetryConfig";
import type { ThreadDefaults } from "../EditorState";

// docs/specs/32-generator-mode.md — the 5 generator patterns this milestone ships,
// chosen to exercise every engine capability (single-shape modular math, 2-shape and
// N-shape composites, and the curve-sampled/freehand case). The other 14 patterns
// researched in ~/projects/pocs/research_string_art are architecturally identical (same
// registry shape) and are a follow-up milestone, not built here.
export type GeneratorPatternId =
  | "mandala"
  | "star"
  | "freestyle"
  | "star-of-david"
  | "spirals"
  | "wave"
  | "hexagon-spades"
  | "dance-of-planets"
  | "sun"
  | "vortex"
  | "polygon"
  | "flower"
  | "assymetry"
  | "spiral"
  | "maurer-rose"
  | "comet"
  | "flower-of-life"
  | "crosses"
  | "lotus";

export interface FreestyleCircleParams {
  enabled: boolean;
  nails: number;
  radiusRatio: number; // of the board's max inscribed radius
  centerXRatio: number; // -1..1, of the board's max inscribed radius, offset from board centre
  centerYRatio: number;
}

export interface AssymetryLayerParams {
  enabled: boolean;
  start: number; // 0..1, fraction of the combined circle+spoke index space
  end: number; // 0..1
  reverse: boolean;
}

export type GeneratorParams =
  | { patternId: "mandala"; n: number; base: number; layers: number }
  | { patternId: "star"; sideNails: number; starPoints: number; starOuterRatio: number; starInnerRatio: number; rotation: number }
  | { patternId: "freestyle"; circles: FreestyleCircleParams[] }
  | { patternId: "star-of-david"; depth: number; layerAngle: number; rotation: number; mirrorTiling: boolean }
  | { patternId: "spirals"; arms: number; nailsPerSpiral: number; totalAngleTurns: number; rotation: number }
  | { patternId: "wave"; n: number; base: number; layers: number; layerFill: number; layerSpread: number }
  | { patternId: "hexagon-spades"; depth: number; layerAngle: number; rotation: number; mirrorTiling: boolean }
  | {
      patternId: "dance-of-planets";
      outerType: "circle" | "polygon";
      outerNails: number;
      outerSides: number;
      innerType: "circle" | "polygon";
      innerNails: number;
      innerSides: number;
      innerSizeRatio: number;
      rounds: number;
      reverse: boolean;
      rotation: number;
    }
  | { patternId: "sun"; sideNails: number; starPoints: number; starOuterRatio: number; starInnerRatio: number; rotation: number; layers: number; layerSpread: number }
  | { patternId: "vortex"; sides: number; nailsPerSide: number; layers: number; layerAngle: number; rotation: number }
  | { patternId: "polygon"; sides: number; nailsPerSide: number; bezierStep: number; rotation: number }
  | { patternId: "flower"; sides: number; nailsPerSide: number; layers: number; rotation: number }
  | { patternId: "assymetry"; circleNails: number; layers: AssymetryLayerParams[]; rotation: number }
  | { patternId: "spiral"; n: number; repetition: number; innerLength: number; rotation: number }
  | { patternId: "maurer-rose"; N: number; maxSteps: number; angleDegrees: number; rotation: number }
  | { patternId: "comet"; n: number; layers: number; firstLayerSize: number; layerDistance: number; clusterStrength: number; distortion: number; rotation: number }
  | { patternId: "flower-of-life"; levels: number; density: number; rotation: number; ringEnabled: boolean; ringNails: number; ringBase: number }
  | { patternId: "crosses"; nailsPerLine: number; orientation: "vertical" | "horizontal"; gap: number; sidesRotation: number }
  | { patternId: "lotus"; sides: number; density: number; rotation: number; removeSections: number; renderCenter: boolean; centerRadius: number; radialColor: boolean };

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
// 24), independent of `depth`/`mirrorTiling`. Star runs one curve-stitch fan per point
// (`starPoints` spokes, each fanned against its own local arc of circle pins — see
// buildStar). Freestyle and Spirals each thread as ONE continuous Thread Path (round-
// robin across circles, or visiting every sampled point in sequence) — splitting
// either into independently-coloured runs would change what they draw, not just how
// they're coloured, so they cap at 1: adding a second colour there would never be used
// by anything (see GeneratorPanel, which grows its colour palette from a `+` button,
// disabled once this cap is reached).
export function maxGeneratorColours(params: GeneratorParams): number {
  switch (params.patternId) {
    case "mandala":
      return Math.max(1, params.layers);
    case "star":
      // 2 spoke↔circle zigzags per point + 1 adjacent-spoke zigzag per point (see
      // buildStar) — 3*starPoints Thread Paths total.
      return params.starPoints * 3;
    case "freestyle":
    case "spirals":
      return 1;
    case "star-of-david":
      return 24;
    case "wave":
      return Math.max(1, params.layers);
    case "hexagon-spades":
      return 18;
    case "dance-of-planets":
      return 1;
    case "sun":
      return params.starPoints * 3 + params.layers;
    case "vortex":
      return Math.max(1, params.layers);
    case "polygon":
      return params.sides;
    case "flower":
      return params.sides * params.layers;
    case "assymetry":
      return Math.max(1, params.layers.filter((l) => l.enabled).length);
    case "spiral":
      return 1;
    case "maurer-rose":
      return 1;
    case "comet":
      return Math.max(1, params.layers);
    case "flower-of-life":
      return 6 * params.levels * params.levels + (params.ringEnabled ? 1 : 0);
    case "crosses":
      return 10;
    case "lotus": {
      const sections = lotusSectionsCount(params.sides);
      const removed = lotusRemovedSectionsCount(params.sides, params.removeSections);
      return lotusColourGroupCount(params.sides, sections, removed, params.renderCenter, params.radialColor);
    }
  }
}

function circlePerimeter(radius: number): number {
  return 2 * Math.PI * radius;
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

// A "spoke wheel" star, not a pointed-polygon outline: `starPoints` straight spokes
// radiate from the board centre out to the rim, each carrying `sideNails` pins — plus
// one outer circle. Each spoke is curve-stitched (docs/specs/32-generator-mode.md
// §Star — the classic "connect ray point k to point count-1-k of a nearby second ray"
// parabola technique) against its OWN local arc of circle pins (the `sideNails-1`
// circle pins nearest that spoke, not the whole ring) — this is what makes every point
// look genuinely different from its neighbours: each is an independent local curve,
// not a shared global weave or a concentric nested spiral.
//
// Earlier attempts at this pattern under-shot the connectivity — a flat star round-
// robinned uniformly against the whole circle, then a nested/concentric star, then a
// single curve-stitch fan per point, all visually too sparse/uniform. This version
// layers three independent zigzags per neighbouring pair instead of one
// (`starSpokeCircleZigzag`/`starAdjacentSpokeZigzag`, `src/domain/generator/
// starWeave.ts`): two curve-stitch sweeps between a spoke and the circle (one toward
// each neighbouring point, both pivoting on the shared boundary pin between them) plus
// a third directly between the two adjacent spokes, bypassing the circle. Denser and
// more textured than a single fan, while each pass is still just the same generic
// "connect ray point k to a nearby point on a second ray" curve-stitch idea used
// elsewhere in this engine — an original design for this pattern, not a reproduction
// of any specific reference implementation.
function buildStar(params: Extract<GeneratorParams, { patternId: "star" }>, ctx: GeneratorBuildContext): GeneratorBuildResult {
  const { starPoints, sideNails, starOuterRatio, starInnerRatio, rotation } = params;
  const innerRadius = ctx.maxRadius * starInnerRatio;
  const outerRadius = ctx.maxRadius * starOuterRatio;

  const circleGeometry: PinPathGeometry = { type: "circle", center: ctx.center, radius: ctx.maxRadius };
  // Matches the spoke/arc proportions this pattern's geometry uses: an arc of
  // `sideNails - 1` circle pins allocated per spoke, `starPoints` spokes total.
  const circleSpacing = spacingForPinCount(circlePerimeter(ctx.maxRadius), starPoints * (sideNails - 1));
  const circlePath = createPinPath(circleGeometry, circleSpacing, ctx.pinStyle);

  const spokePaths: PinPath[] = [];
  for (let s = 0; s < starPoints; s += 1) {
    // No -π/2 top-of-circle offset here (unlike every other pattern's vertexAt-style
    // convention): must align with the circle's OWN angle-0 start (pointAtDistance(0)
    // on CircularArcSegment is at angle 0, i.e. straight right, not top) so spoke s's
    // local arc below actually sits next to spoke s, not offset by a quarter turn.
    const angle = rotation + (2 * Math.PI * s) / starPoints;
    const start: Point = { x: ctx.center.x + innerRadius * Math.cos(angle), y: ctx.center.y + innerRadius * Math.sin(angle) };
    const end: Point = { x: ctx.center.x + outerRadius * Math.cos(angle), y: ctx.center.y + outerRadius * Math.sin(angle) };
    const spokeGeometry: PinPathGeometry = { type: "line", start, end };
    // Vertex-anchored (a "line" is in VERTEX_ANCHORED_TYPES) forces BOTH endpoints —
    // spacingForPinCount(length, sideNails - 1) yields exactly `sideNails` pins
    // (1 vertex + (n-1) interior pins per the app's own open-path distribution rule).
    const spokeSpacing = spacingForPinCount(outerRadius - innerRadius, sideNails - 1);
    spokePaths.push(createPinPath(spokeGeometry, spokeSpacing, ctx.pinStyle));
  }

  const palette = ctx.threadDefaults.colours.length > 0 ? ctx.threadDefaults.colours : ["#5b8def"];
  const resolve = (node: { kind: "circle"; index: number } | { kind: "spoke"; spoke: number; index: number }): string =>
    node.kind === "circle" ? circlePath.pins[node.index].id : spokePaths[node.spoke].pins[node.index].id;

  const threadPaths: ThreadPath[] = [];
  for (let s = 0; s < starPoints; s += 1) {
    for (const direction of [1, -1] as const) {
      const pinIds = starSpokeCircleZigzag(starPoints, sideNails, s, direction).map(resolve);
      threadPaths.push(createThreadPath(pinIds, [palette[threadPaths.length % palette.length]], ctx.threadDefaults.width, ctx.threadDefaults.twistPitch));
    }
  }
  for (let s = 0; s < starPoints; s += 1) {
    const pinIds = starAdjacentSpokeZigzag(sideNails, s, (s + 1) % starPoints).map(resolve);
    threadPaths.push(createThreadPath(pinIds, [palette[threadPaths.length % palette.length]], ctx.threadDefaults.width, ctx.threadDefaults.twistPitch));
  }

  return { pinPaths: [circlePath, ...spokePaths], threadPaths };
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

// Seven tiles — one central hexagon plus six equilateral triangles arranged around it
// on a shared helper-circle ring (`tileRingLayout`, `src/domain/generator/tileRing.ts`),
// each tile itself a nested-polygon spiral (docs/specs/32-generator-mode.md). This is
// the actual construction (verified against a real reference render's nail
// coordinates: the outer tip radius equals R0, the central hexagon's own vertex radius
// is exactly R0/√3, and each triangle's centre sits exactly 30° off the nearest
// hexagon vertex — i.e. centred on a hexagon EDGE, not a vertex, which is what makes
// the six triangles' outward tips interleave with the hexagon's own vertices into a
// proper 6-pointed silhouette instead of a flat hexagon outline). NOT two flat
// overlapping triangles — that was this pattern's original (incorrect) implementation,
// replaced after visual comparison against a real reference render showed it wasn't
// even the right topology, let alone the nested-spiral fill.
function buildStarOfDavidTiles(rotation: number, mirrorTiling: boolean, maxRadius: number, center: Point): TileRingTile[] {
  const innerHexRadius = maxRadius / Math.sqrt(3);
  const triangleRadius = maxRadius / 3;
  const helperRadius = innerHexRadius * Math.cos(Math.PI / 6) + triangleRadius / 2; // == 2*maxRadius/3

  const hub: TileRingTile = { sides: 6, center, baseRotation: rotation, direction: 1 };
  // +30° (π/6) offset so each triangle centres on a hexagon EDGE, not a vertex.
  const ring = tileRingLayout(6, 3, helperRadius, Math.PI / 6, rotation, center, mirrorTiling);
  return [hub, ...ring];
}

function buildTilePinPath(tile: TileRingTile, baseRadius: number, layerAngle: number, depth: number, ctx: GeneratorBuildContext): PinPath {
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

// Shared by Star of David, Hexagon Spades and Flower of Life: every tile in `tiles`
// gets its own nested-polygon-filled PinPath (`buildTilePinPath`), then one Thread Path
// per (tile, side) adjacent-side fan (`connectTwoSidesLocalIndices`) — matches this
// family's researched multi-colour default (docs/specs/32-generator-mode.md), so each
// side of each tile is independently recolourable afterward via the Thread Properties
// panel. Each run gets ONE colour, cycling through the palette by run index (same rule
// as Mandala's layers, docs/specs/32-generator-mode.md §Multicolor) — never the whole
// palette handed to one Thread Path, which would render as a multi-strand TWIST within
// that single run instead of colouring separate runs differently.
function buildTileFans(tiles: TileRingTile[], radiusForTile: (tile: TileRingTile) => number, layerAngle: number, depth: number, ctx: GeneratorBuildContext): GeneratorBuildResult {
  const pinPaths = tiles.map((tile) => buildTilePinPath(tile, radiusForTile(tile), layerAngle, depth, ctx));
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

function buildStarOfDavid(params: Extract<GeneratorParams, { patternId: "star-of-david" }>, ctx: GeneratorBuildContext): GeneratorBuildResult {
  const { depth, layerAngle, rotation, mirrorTiling } = params;
  const innerHexRadius = ctx.maxRadius / Math.sqrt(3);
  const triangleRadius = ctx.maxRadius / 3;
  const tiles = buildStarOfDavidTiles(rotation, mirrorTiling, ctx.maxRadius, ctx.center);
  return buildTileFans(tiles, (tile) => (tile.sides === 6 ? innerHexRadius : triangleRadius), layerAngle, depth, ctx);
}

// Hexagon Spades — the same 6-triangle ring construction as Star of David's own tiles
// (`tileRingLayout(6, 3, ...)`, src/domain/generator/tileRing.ts), just with no central
// hexagon hub, so the six nested-spiral triangle "spades" stand alone.
function buildHexagonSpades(params: Extract<GeneratorParams, { patternId: "hexagon-spades" }>, ctx: GeneratorBuildContext): GeneratorBuildResult {
  const { depth, layerAngle, rotation, mirrorTiling } = params;
  // Same 6-triangle ring construction as Star of David's own outer tiles, but a
  // DIFFERENT proportion — Star of David's tiles share the board with a central
  // hexagon hub (triangleRadius=R0/3, helperRadius=2R0/3), while Hexagon Spades has no
  // hub competing for space, so its 6 triangles can be both bigger and closer to
  // centre: an equal 1:1 split (tip radius reaching R0 exactly).
  const triangleRadius = ctx.maxRadius * 0.5;
  const helperRadius = ctx.maxRadius * 0.5;
  const tiles = tileRingLayout(6, 3, helperRadius, Math.PI / 6, rotation, ctx.center, mirrorTiling);
  return buildTileFans(tiles, () => triangleRadius, layerAngle, depth, ctx);
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

function buildWave(params: Extract<GeneratorParams, { patternId: "wave" }>, ctx: GeneratorBuildContext): GeneratorBuildResult {
  const geometry: PinPathGeometry = { type: "circle", center: ctx.center, radius: ctx.maxRadius };
  const spacing = spacingForPinCount(circlePerimeter(ctx.maxRadius), params.n);
  const pinPath = createPinPath(geometry, spacing, ctx.pinStyle);
  const layers = waveLayerSequences(params.n, params.base, params.layers, params.layerFill, params.layerSpread);
  const palette = ctx.threadDefaults.colours.length > 0 ? ctx.threadDefaults.colours : ["#5b8def"];
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

function buildRingPinPath(type: "circle" | "polygon", sides: number, radius: number, rotation: number, center: Point, ctx: GeneratorBuildContext, nails: number): PinPath {
  if (type === "circle") {
    const geometry: PinPathGeometry = { type: "circle", center, radius };
    const spacing = spacingForPinCount(circlePerimeter(radius), nails);
    return createPinPath(geometry, spacing, ctx.pinStyle);
  }
  const geometry: PinPathGeometry = { type: "regular-polygon", center, radius, sides, rotation };
  const nailsPerSide = Math.max(1, Math.round(nails / sides));
  const sideLength = 2 * radius * Math.sin(Math.PI / sides);
  const spacing = spacingForPinCount(sideLength, nailsPerSide);
  return createPinPath(geometry, spacing, ctx.pinStyle);
}

// Two concentric rings (circle or regular polygon, independently) woven by
// danceOfPlanetsWalk (src/domain/generator/danceOfPlanetsWalk.ts) — NOT a same-index
// round-robin (an earlier, structurally wrong assumption: that connects a long cross-
// ring chord on every step). The real weave mostly traces each ring's OWN boundary in
// short adjacent-index pieces, alternating which ring gets the next piece — the
// alternation itself is what creates the only cross-ring connections. `reverse` walks
// the inner ring's index backward, which is what makes the two rings appear to
// counter-rotate against each other — the "planets" in the name.
function buildDanceOfPlanets(params: Extract<GeneratorParams, { patternId: "dance-of-planets" }>, ctx: GeneratorBuildContext): GeneratorBuildResult {
  const { outerType, outerNails, outerSides, innerType, innerNails, innerSides, innerSizeRatio, rounds, reverse, rotation } = params;
  const outerPath = buildRingPinPath(outerType, outerSides, ctx.maxRadius, rotation, ctx.center, ctx, outerNails);
  const innerPath = buildRingPinPath(innerType, innerSides, ctx.maxRadius * innerSizeRatio, rotation, ctx.center, ctx, innerNails);
  const outerCount = outerPath.pins.length;
  const innerCount = innerPath.pins.length;
  const pinIds = danceOfPlanetsWalk(outerCount, innerCount, rounds, reverse).map((node) =>
    (node.which === "outer" ? outerPath : innerPath).pins[node.index].id,
  );
  const threadPath = createThreadPath(pinIds, ctx.threadDefaults.colours, ctx.threadDefaults.width, ctx.threadDefaults.twistPitch);
  return { pinPaths: [outerPath, innerPath], threadPaths: pinIds.length >= 2 ? [threadPath] : [] };
}

// Sun — reuses buildStar's own spoke-wheel construction verbatim for the base shape,
// then adds `layers` extra shrinking concentric rings (each a simple base-2 modular
// self-weave, mandalaLayerSequences reused with a single layer) as decorative "rays"
// around it — an original simplification, not a new geometry primitive.
function buildSun(params: Extract<GeneratorParams, { patternId: "sun" }>, ctx: GeneratorBuildContext): GeneratorBuildResult {
  const { sideNails, starPoints, starOuterRatio, starInnerRatio, rotation, layers, layerSpread } = params;
  const base = buildStar({ patternId: "star", sideNails, starPoints, starOuterRatio, starInnerRatio, rotation }, ctx);
  const palette = ctx.threadDefaults.colours.length > 0 ? ctx.threadDefaults.colours : ["#5b8def"];
  const pinPaths = [...base.pinPaths];
  const threadPaths = [...base.threadPaths];
  // Extra layers are shrinking POINTED stars (native "star" PinPathGeometry — the
  // classic outer/inner-radius alternating-vertex polygon), not circles: the real Sun
  // redraws its own StarShape at a shrinking size for each extra layer, so a shrinking
  // star (self-threaded via a simple base-2 modular weave) is a much closer original
  // match than a plain ring.
  for (let layer = 1; layer <= layers; layer += 1) {
    const ratio = Math.max(0.05, starOuterRatio * (1 - layerSpread * layer));
    const geometry: PinPathGeometry = {
      type: "star",
      center: ctx.center,
      outerRadius: ctx.maxRadius * ratio,
      innerRadius: ctx.maxRadius * ratio * Math.max(0.1, starInnerRatio || 0.4),
      points: starPoints,
      rotation,
    };
    const starVertexCount = starPoints * 2;
    const spacing = spacingForPinCount(circlePerimeter(ctx.maxRadius * ratio), starVertexCount);
    const starPath = createPinPath(geometry, spacing, ctx.pinStyle);
    const ringLayer = mandalaLayerSequences(starPath.pins.length, 2, 1)[0];
    const ringThread = createThreadPath(
      ringLayer.localIndices.map((i) => starPath.pins[i].id),
      [palette[threadPaths.length % palette.length]],
      ctx.threadDefaults.width,
      ctx.threadDefaults.twistPitch,
    );
    pinPaths.push(starPath);
    threadPaths.push(ringThread);
  }
  return { pinPaths, threadPaths };
}

// Vortex — `layers` nested/inscribed regular polygons (nestedPolygonLevels, the same
// shrink-and-twist primitive Star of David's tiles use, one native "regular-polygon"
// PinPath per level so each gets its own vertex-anchored `nailsPerSide` pins per
// side). Within EACH level, side `s`'s pin `i` connects to side `(s+1)%sides`'s pin
// `i` — a same-index chord across every side. Chaining all `sides` of those chords for
// a fixed `i` into one closed-loop Thread Path (side0.i → side1.i → … → side0.i)
// reproduces that exact same set of chords with no extra segments, since each chord
// shares its endpoint with the next (this is the corrected version of an earlier
// "closed outline per level" simplification, which was a genuinely different — and
// far sparser — topology than this per-side-index weave).
function buildVortex(params: Extract<GeneratorParams, { patternId: "vortex" }>, ctx: GeneratorBuildContext): GeneratorBuildResult {
  const { sides, nailsPerSide, layers, layerAngle, rotation } = params;
  const levels = nestedPolygonLevels(sides, ctx.maxRadius, rotation, layerAngle, layers, 1);
  const pinPaths: PinPath[] = levels.map((level) => {
    const geometry: PinPathGeometry = { type: "regular-polygon", center: ctx.center, radius: level.radius, sides, rotation: level.rotation };
    const sideLength = 2 * level.radius * Math.sin(Math.PI / sides);
    const spacing = spacingForPinCount(sideLength, nailsPerSide);
    return createPinPath(geometry, spacing, ctx.pinStyle);
  });
  const palette = ctx.threadDefaults.colours.length > 0 ? ctx.threadDefaults.colours : ["#5b8def"];
  const threadPaths: ThreadPath[] = [];
  pinPaths.forEach((path, level) => {
    const colour = palette[level % palette.length];
    for (let i = 0; i < nailsPerSide; i += 1) {
      const pinIds = Array.from({ length: sides + 1 }, (_, s) => path.pins[(s % sides) * nailsPerSide + i].id);
      threadPaths.push(createThreadPath(pinIds, [colour], ctx.threadDefaults.width, ctx.threadDefaults.twistPitch));
    }
  });
  return { pinPaths, threadPaths };
}

// Shared by Polygon and Flower: one `regular-polygon` PinPath (sides*nailsPerSide pins,
// vertex-anchored — side s's pins are local indices s*nailsPerSide..s*nailsPerSide+
// nailsPerSide-1), curve-stitched (sameIndexZigzag, src/domain/generator/rayZigzag.ts
// — same-index chords across two sides, not reversed pairing, which is what a regular
// polygon's own side-to-side "Bézier" envelope actually uses) between side s and side
// (s+bezierStep)%sides, one Thread Path per side.
function buildPolygonCore(sides: number, nailsPerSide: number, bezierStep: number, rotation: number, ctx: GeneratorBuildContext, colourOffset: number): { pinPath: PinPath; threadPaths: ThreadPath[] } {
  const geometry: PinPathGeometry = { type: "regular-polygon", center: ctx.center, radius: ctx.maxRadius, sides, rotation };
  const sideLength = 2 * ctx.maxRadius * Math.sin(Math.PI / sides);
  const spacing = spacingForPinCount(sideLength, nailsPerSide);
  const pinPath = createPinPath(geometry, spacing, ctx.pinStyle);
  const palette = ctx.threadDefaults.colours.length > 0 ? ctx.threadDefaults.colours : ["#5b8def"];
  const threadPaths: ThreadPath[] = [];
  for (let s = 0; s < sides; s += 1) {
    const otherSide = (s + bezierStep) % sides;
    const sideAStart = s * nailsPerSide;
    const sideBStart = otherSide * nailsPerSide;
    const resolve = (node: RayZigzagNode): string => pinPath.pins[(node.which === "A" ? sideAStart : sideBStart) + node.index].id;
    const pinIds = sameIndexZigzag(nailsPerSide, nailsPerSide).map(resolve);
    threadPaths.push(createThreadPath(pinIds, [palette[(colourOffset + threadPaths.length) % palette.length]], ctx.threadDefaults.width, ctx.threadDefaults.twistPitch));
  }
  return { pinPath, threadPaths };
}

function buildPolygon(params: Extract<GeneratorParams, { patternId: "polygon" }>, ctx: GeneratorBuildContext): GeneratorBuildResult {
  const { sides, nailsPerSide, bezierStep, rotation } = params;
  const { pinPath, threadPaths } = buildPolygonCore(sides, nailsPerSide, bezierStep, rotation, ctx, 0);
  return { pinPaths: [pinPath], threadPaths };
}

// Flower — `layers` rotated copies of Polygon's own geometry/weave (buildPolygonCore),
// each offset a little further around the circle, so the copies overlap into a
// "petal" look — same primitive as Polygon, just repeated at increasing rotation.
// Flower — NOT rotated copies of Polygon's own side-to-side weave (an earlier,
// structurally wrong simplification). Each layer is one polygon boundary PLUS one
// small "centre spoke" line per side (radiating from the board centre out toward that
// side's own bisector direction). Each side's own petal weaves its boundary points
// against that dedicated centre spoke (flowerPetalWeave, src/domain/generator/
// flowerWeave.ts) — the shared centre anchor is what bulges each side's weave into a
// petal shape instead of a flat envelope.
function buildFlower(params: Extract<GeneratorParams, { patternId: "flower" }>, ctx: GeneratorBuildContext): GeneratorBuildResult {
  const { sides, nailsPerSide, layers, rotation } = params;
  const pinPaths: PinPath[] = [];
  const threadPaths: ThreadPath[] = [];
  const palette = ctx.threadDefaults.colours.length > 0 ? ctx.threadDefaults.colours : ["#5b8def"];
  const centreSpokeLength = ctx.maxRadius * 0.6;

  for (let layer = 0; layer < layers; layer += 1) {
    const layerRotation = rotation + (layer * 2 * Math.PI) / (sides * Math.max(1, layers));

    const boundaryGeometry: PinPathGeometry = { type: "regular-polygon", center: ctx.center, radius: ctx.maxRadius, sides, rotation: layerRotation };
    const sideLength = 2 * ctx.maxRadius * Math.sin(Math.PI / sides);
    const boundarySpacing = spacingForPinCount(sideLength, nailsPerSide);
    const boundaryPath = createPinPath(boundaryGeometry, boundarySpacing, ctx.pinStyle);
    pinPaths.push(boundaryPath);

    const centreSpokes: PinPath[] = [];
    for (let s = 0; s < sides; s += 1) {
      const bisectorAngle = layerRotation + (2 * Math.PI * (s + 0.5)) / sides - Math.PI / 2;
      const spokeEnd: Point = { x: ctx.center.x + centreSpokeLength * Math.cos(bisectorAngle), y: ctx.center.y + centreSpokeLength * Math.sin(bisectorAngle) };
      const spokeGeometry: PinPathGeometry = { type: "line", start: ctx.center, end: spokeEnd };
      // Centre indices used by flowerPetalWeave range 1..nailsPerSide-2, so
      // nailsPerSide-1 pins (0..nailsPerSide-2) covers the range with one spare.
      const spokeSpacing = spacingForPinCount(centreSpokeLength, Math.max(1, nailsPerSide - 2));
      const spokePath = createPinPath(spokeGeometry, spokeSpacing, ctx.pinStyle);
      centreSpokes.push(spokePath);
      pinPaths.push(spokePath);
    }

    for (let s = 0; s < sides; s += 1) {
      const prevSide = (s - 1 + sides) % sides;
      const nextSide = (s + 1) % sides;
      const resolve = (node: FlowerPetalNode): string => {
        if (node.which === "centre") {
          const idx = Math.min(node.index, centreSpokes[s].pins.length - 1);
          return centreSpokes[s].pins[idx].id;
        }
        const side = node.which === "prevSide" ? prevSide : node.which === "nextSide" ? nextSide : s;
        return boundaryPath.pins[side * nailsPerSide + node.index].id;
      };
      const pinIds = flowerPetalWeave(nailsPerSide).map(resolve);
      threadPaths.push(createThreadPath(pinIds, [palette[threadPaths.length % palette.length]], ctx.threadDefaults.width, ctx.threadDefaults.twistPitch));
    }
  }
  return { pinPaths, threadPaths };
}

// Assymetry — 1 circle + 1 spoke line (the same line-geometry construction buildStar
// uses for its own spokes), woven by up to 3 independent, individually enable/
// configurable asymmetryZigzag passes — confirmed against a reference render's own
// line-segment counts (which solved exactly for n=137, lineNailCount=22, matching
// round(n/2π)) that its default view really is 3 overlaid passes with distinct
// start/end/reverse fractions, not a single configurable one; each layer's own
// start/end/reverse stays user-editable, defaulting to those solved fractions
// (`GENERATOR_PATTERNS.assymetry.defaultParams`), same "array of per-item configs"
// convention Freestyle's circles already use. Each enabled pass is its own Thread
// Path/colour (same "one colour per run" convention as every other multi-run pattern
// here).
function buildAssymetry(params: Extract<GeneratorParams, { patternId: "assymetry" }>, ctx: GeneratorBuildContext): GeneratorBuildResult {
  const { circleNails, layers, rotation } = params;
  const circleGeometry: PinPathGeometry = { type: "circle", center: ctx.center, radius: ctx.maxRadius };
  const circleSpacing = spacingForPinCount(circlePerimeter(ctx.maxRadius), circleNails);
  const circlePath = createPinPath(circleGeometry, circleSpacing, ctx.pinStyle);

  // Same physical nail spacing on the spoke as on the circle (a circle of radius R and
  // circleNails nails has spacing 2πR/circleNails; a spoke of length R divided at that
  // spacing gets round(R / (2πR/circleNails)) = round(circleNails/2π) intervals).
  const spokeNailCount = Math.max(1, Math.round(circleNails / (2 * Math.PI)));
  const end: Point = { x: ctx.center.x + ctx.maxRadius * Math.cos(rotation), y: ctx.center.y + ctx.maxRadius * Math.sin(rotation) };
  const spokeGeometry: PinPathGeometry = { type: "line", start: ctx.center, end };
  const spokeSpacing = spacingForPinCount(ctx.maxRadius, spokeNailCount);
  const spokePath = createPinPath(spokeGeometry, spokeSpacing, ctx.pinStyle);

  const resolve = (node: AsymmetryNode): string => (node.which === "circle" ? circlePath.pins[node.index].id : spokePath.pins[node.index].id);
  const palette = ctx.threadDefaults.colours.length > 0 ? ctx.threadDefaults.colours : ["#5b8def"];
  const threadPaths: ThreadPath[] = [];
  const enabledLayers = layers.filter((l) => l.enabled);
  enabledLayers.forEach((layer, i) => {
    const pinIds = asymmetryZigzag(circleNails, spokeNailCount, layer.start, layer.end, layer.reverse).map(resolve);
    if (pinIds.length >= 2) threadPaths.push(createThreadPath(pinIds, [palette[i % palette.length]], ctx.threadDefaults.width, ctx.threadDefaults.twistPitch));
  });
  return { pinPaths: [circlePath, spokePath], threadPaths };
}

// Spiral (singular) — one circle, one continuous decaying-chord-span walk
// (spiralDecayingWalk). `rotation` has no native field on a plain circle geometry, so
// it's applied as an index shift on the walk instead — visually equivalent to rotating
// the ring, without inventing a new geometry primitive for one parameter.
function buildSpiral(params: Extract<GeneratorParams, { patternId: "spiral" }>, ctx: GeneratorBuildContext): GeneratorBuildResult {
  const { n, repetition, innerLength, rotation } = params;
  const geometry: PinPathGeometry = { type: "circle", center: ctx.center, radius: ctx.maxRadius };
  const spacing = spacingForPinCount(circlePerimeter(ctx.maxRadius), n);
  const pinPath = createPinPath(geometry, spacing, ctx.pinStyle);
  const shift = Math.round((rotation / (2 * Math.PI)) * n);
  const walk = spiralDecayingWalk(n, repetition, innerLength).map((i) => ((i + shift) % n + n) % n);
  const pinIds = walk.map((i) => pinPath.pins[i].id);
  const threadPath = createThreadPath(pinIds, ctx.threadDefaults.colours, ctx.threadDefaults.width, ctx.threadDefaults.twistPitch);
  return { pinPaths: [pinPath], threadPaths: pinIds.length >= 2 ? [threadPath] : [] };
}

// Maurer Rose — the classic public rose-curve construction (maurerRosePoints), curve-
// sampled points built directly into pins, same freehand-bypass architecture as
// Spirals (createPinPath/distributePins would arc-length-resample and destroy the
// computed positions).
function buildMaurerRose(params: Extract<GeneratorParams, { patternId: "maurer-rose" }>, ctx: GeneratorBuildContext): GeneratorBuildResult {
  const { N, maxSteps, angleDegrees, rotation } = params;
  const points = maurerRosePoints(N, maxSteps, angleDegrees, rotation, ctx.maxRadius, ctx.center);
  const pins: Pin[] = points.map((p) => ({ id: nextPinId(), ...p }));
  const pinPath: PinPath = {
    id: nextPathId(),
    geometry: { type: "freehand", points },
    requestedSpacing: ctx.maxRadius / Math.max(1, maxSteps),
    actualSpacing: ctx.maxRadius / Math.max(1, maxSteps),
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

// Comet — one ELLIPSE (not a circle — confirmed against a reference render's own nail
// coordinates, which fit an ellipse equation to within 0.7%; `distortion` controls its
// eccentricity, `yRadius = maxRadius*(1-distortion)` against a fixed `xRadius =
// maxRadius`), `layers` offset-alternation passes (cometLayerSequences) whose offset
// shrinks per layer (by `layerDistance`); each layer's own run length is derived from
// that offset, not set independently, which is what gives the accumulated result its
// tapering "tail". Nails are NOT evenly spaced around the ellipse either —
// `clusterFraction` (comet.ts) clusters them near the tail direction (angle 0, before
// `rotation`) and spreads them out near the opposite side (also confirmed against the
// same reference nail coordinates — clearly non-uniform angular density). Built
// directly into `pins[]` (freehand-bypass, same architecture as Spirals/Vortex/Maurer
// Rose) since the pins are exact computed positions, not evenly resampled.
function buildComet(params: Extract<GeneratorParams, { patternId: "comet" }>, ctx: GeneratorBuildContext): GeneratorBuildResult {
  const { n, layers, firstLayerSize, layerDistance, clusterStrength, distortion, rotation } = params;
  const xRadius = ctx.maxRadius;
  const yRadius = ctx.maxRadius * (1 - Math.max(0, Math.min(0.9, distortion)));
  const points: Point[] = Array.from({ length: n }, (_, i) => {
    const angle = rotation + clusterFraction(i / n, clusterStrength) * 2 * Math.PI;
    return { x: ctx.center.x + xRadius * Math.cos(angle), y: ctx.center.y + yRadius * Math.sin(angle) };
  });
  const pins: Pin[] = points.map((p) => ({ id: nextPinId(), ...p }));
  const pinPath: PinPath = {
    id: nextPathId(),
    geometry: { type: "freehand", points },
    requestedSpacing: circlePerimeter(ctx.maxRadius) / Math.max(1, n),
    actualSpacing: circlePerimeter(ctx.maxRadius) / Math.max(1, n),
    pins,
    guideVisible: ctx.pinStyle.guideVisible,
    colour: ctx.pinStyle.colour,
    diameter: ctx.pinStyle.diameter,
    symmetry: NO_SYMMETRY,
  };
  const palette = ctx.threadDefaults.colours.length > 0 ? ctx.threadDefaults.colours : ["#5b8def"];
  const layerSeqs = cometLayerSequences(n, layers, firstLayerSize, layerDistance);
  const threadPaths = layerSeqs.map((layer, i) =>
    createThreadPath(
      layer.localIndices.map((idx) => pins[idx].id),
      [palette[i % palette.length]],
      ctx.threadDefaults.width,
      ctx.threadDefaults.twistPitch,
    ),
  );
  return { pinPaths: [pinPath], threadPaths };
}

// Flower of Life — the same 6-triangle ring as Hexagon Spades, plus an optional outer
// ring circle (its own simple base-N modular self-weave, mandalaLayerSequences reused
// with a single layer). Simplified: the real pattern is a 6·levels² hex-grid tiling;
// this ships a fixed 6-tile ring + optional ring, stated plainly, same precedent as
// this milestone's other deliberately-simplified patterns.
// Flower of Life — a proper hexagonal triangular-lattice grid (hexFlowerGrid,
// src/domain/generator/hexFlowerGrid.ts), `6·levels²` small flat triangles, each its
// own `regular-polygon` (sides=3) Pin Path with `density` nails per side. Each
// triangle self-weaves across all 3 of its own sides (sameIndexZigzag chained
// side0↔side1, side1↔side2, side2↔side0) — an original simplification of the real
// pattern's own more intricate per-triangle alternation, plus an optional outer ring
// circle with its own base-`ringBase` modular self-weave. This replaces an earlier,
// far sparser fixed-6-tile approximation once the real `6·levels²` scale was
// confirmed directly from the pattern's own step-count formula.
function buildFlowerOfLife(params: Extract<GeneratorParams, { patternId: "flower-of-life" }>, ctx: GeneratorBuildContext): GeneratorBuildResult {
  const { levels, density, rotation, ringEnabled, ringNails, ringBase } = params;
  const cells = hexFlowerGrid(levels, ctx.maxRadius, rotation, ctx.center);
  const triangleRadius = ctx.maxRadius / levels / Math.sqrt(3);
  const sideLength = triangleRadius * Math.sqrt(3);
  const spacing = spacingForPinCount(sideLength, density);
  const palette = ctx.threadDefaults.colours.length > 0 ? ctx.threadDefaults.colours : ["#5b8def"];

  const pinPaths: PinPath[] = [];
  const threadPaths: ThreadPath[] = [];
  cells.forEach((cell, cellIndex) => {
    const geometry: PinPathGeometry = { type: "regular-polygon", center: cell.center, radius: triangleRadius, sides: 3, rotation: cell.rotation };
    const trianglePath = createPinPath(geometry, spacing, ctx.pinStyle);
    pinPaths.push(trianglePath);
    const resolve = (node: RayZigzagNode, sideAStart: number, sideBStart: number): string =>
      trianglePath.pins[(node.which === "A" ? sideAStart : sideBStart) + node.index].id;
    const pinIds = [
      ...sameIndexZigzag(density, density).map((n) => resolve(n, 0, density)),
      ...sameIndexZigzag(density, density).map((n) => resolve(n, density, 2 * density)),
      ...sameIndexZigzag(density, density).map((n) => resolve(n, 2 * density, 0)),
    ];
    threadPaths.push(createThreadPath(pinIds, [palette[cellIndex % palette.length]], ctx.threadDefaults.width, ctx.threadDefaults.twistPitch));
  });

  if (!ringEnabled) return { pinPaths, threadPaths };

  const ringGeometry: PinPathGeometry = { type: "circle", center: ctx.center, radius: ctx.maxRadius };
  const ringSpacing = spacingForPinCount(circlePerimeter(ctx.maxRadius), ringNails);
  const ringPath = createPinPath(ringGeometry, ringSpacing, ctx.pinStyle);
  const ringLayer = mandalaLayerSequences(ringNails, ringBase, 1)[0];
  const ringThread = createThreadPath(
    ringLayer.localIndices.map((i) => ringPath.pins[i].id),
    [palette[threadPaths.length % palette.length]],
    ctx.threadDefaults.width,
    ctx.threadDefaults.twistPitch,
  );
  return { pinPaths: [...pinPaths, ringPath], threadPaths: [...threadPaths, ringThread] };
}

// Crosses — the researched pattern's real fixed 10-line arrangement (a central spine
// broken into 4 nail-bearing segments, plus 3 "rows" of 2 arm lines each straddling the
// gaps between segments — 4+6=10 lines total), not the earlier simplified 4-line "#"
// grid. `gap` doubles as both the source's `lengthGap` (spacing between spine segments)
// AND its `widthGap` (spacing between each row's two arms) — the source's own DEFAULT
// behaviour (`lockGap=true`), not an invented simplification. `sidesRotation` tilts only
// the OUTER end of each of row 0's and row 2's two arms (row 1 — the centre row — never
// rotates), pivoting on the arm's own INNER end; the sign flips per corner exactly as
// the source's `getRowLineRotationConfig` does, and flips again for `orientation:
// "horizontal"`. Traversal is `crossesWeave`, run once per the source's own 10
// (spine-segment, row) pairs (`Crosses.pattern.ts`'s `connections` array) — one Thread
// Path per pair, `isReverse = row < spineIndex`. Simplified: the source's canvas-autofit
// bounding-box math (which grows the drawing to compensate for `sidesRotation` pushing
// the silhouette wider/taller) has no equivalent here — this engine always builds
// directly against `ctx.maxRadius`, the same as every other generator pattern, so a
// large tilt can reach slightly outside the inscribed circle rather than shrink to
// compensate; and the source's rich colour-banding/fine-control/asymmetric-centre
// options are not ported, matching this milestone's established simplification
// precedent for its most elaborate patterns.
function buildCrosses(params: Extract<GeneratorParams, { patternId: "crosses" }>, ctx: GeneratorBuildContext): GeneratorBuildResult {
  const { nailsPerLine, orientation, gap, sidesRotation } = params;
  const n = Math.max(2, nailsPerLine);
  const isVertical = orientation === "vertical";
  const totalLength = 2 * ctx.maxRadius;
  const maxSegmentGap = (totalLength * 0.8) / 3;
  const segmentGap = gap * maxSegmentGap;
  const segmentLength = Math.max(1e-6, (totalLength - 3 * segmentGap) / 4);
  const lengthStart = -totalLength / 2;

  // A point at (lengthCoord, widthCoord) along the spine's own length axis and its
  // perpendicular width axis — "vertical" orientation maps length→y, width→x; swapped
  // for "horizontal" (mirrors the source's own axis-swap for its orientation toggle).
  const axisPoint = (lengthCoord: number, widthCoord: number): Point =>
    isVertical ? { x: ctx.center.x + widthCoord, y: ctx.center.y + lengthCoord } : { x: ctx.center.x + lengthCoord, y: ctx.center.y + widthCoord };

  const rotateAround = (p: Point, pivot: Point, angle: number): Point => {
    const dx = p.x - pivot.x;
    const dy = p.y - pivot.y;
    return { x: pivot.x + dx * Math.cos(angle) - dy * Math.sin(angle), y: pivot.y + dx * Math.sin(angle) + dy * Math.cos(angle) };
  };

  const makeLine = (start: Point, end: Point): PinPath => {
    const length = Math.hypot(end.x - start.x, end.y - start.y);
    const spacing = spacingForPinCount(length, n - 1);
    return createPinPath({ type: "line", start, end }, spacing, ctx.pinStyle);
  };

  const spineSpans = [0, 1, 2, 3].map((k) => {
    const start = lengthStart + k * (segmentLength + segmentGap);
    return { start, end: start + segmentLength };
  });
  const spine: PinPath[] = spineSpans.map(({ start, end }) => makeLine(axisPoint(start, 0), axisPoint(end, 0)));

  const armOffset = gap * segmentLength;
  const baseRotation = isVertical ? sidesRotation : -sidesRotation;
  const rows: { left: PinPath; right: PinPath }[] = [0, 1, 2].map((row) => {
    const rowTop = spineSpans[row + 1].start - segmentGap / 2;
    const rowSign = row === 0 ? 1 : row === 2 ? -1 : 0;
    const pivotLeft = axisPoint(rowTop, -armOffset);
    const pivotRight = axisPoint(rowTop, armOffset);
    const outerLeft = rotateAround(axisPoint(rowTop, -armOffset - segmentLength), pivotLeft, rowSign * baseRotation);
    const outerRight = rotateAround(axisPoint(rowTop, armOffset + segmentLength), pivotRight, -rowSign * baseRotation);
    return { left: makeLine(outerLeft, pivotLeft), right: makeLine(outerRight, pivotRight) };
  });

  const palette = ctx.threadDefaults.colours.length > 0 ? ctx.threadDefaults.colours : ["#5b8def"];
  const threadPaths: ThreadPath[] = [];
  const connections: [number, number][] = [
    [0, 0],
    [0, 1],
    [1, 0],
    [1, 1],
    [3, 2],
    [3, 1],
    [2, 1],
    [2, 2],
    [1, 2],
    [2, 0],
  ];
  for (const [spineIndex, row] of connections) {
    const { left, right } = rows[row];
    const resolve = (node: CrossesWeaveNode): string => (node.which === "spine" ? spine[spineIndex] : node.which === "left" ? left : right).pins[node.index].id;
    const pinIds = crossesWeave(n, row < spineIndex).map(resolve);
    threadPaths.push(createThreadPath(pinIds, [palette[threadPaths.length % palette.length]], ctx.threadDefaults.width, ctx.threadDefaults.twistPitch));
  }

  const pinPaths = [...spine, ...rows.flatMap(({ left, right }) => [left, right])];
  return { pinPaths, threadPaths };
}

// Lotus — `sides` overlapping "petal" circles arranged around a helper circle (docs/
// specs/32-generator-mode.md, re-derived from a math write-up of the researched
// reference implementation — see src/domain/generator/lotus.ts's own header comment).
// Pins are built directly from the domain layer's exact index-addressed formulas
// (freehand-bypass, same architecture as Spirals/Comet/Maurer Rose) rather than through
// createPinPath/distributePins, since a partial petal-circle arc's endpoint-inclusive
// spacing rule doesn't match this app's own arc-length distribution. Two earlier
// attempts at this pattern were abandoned as visually wrong even working from the same
// source math — this version keeps geometry/traversal in small, independently unit-
// tested pure functions specifically to make the index arithmetic verifiable rather
// than judged by eye alone (see lotus.test.ts). This engine drops the reference's own
// canvas-margin concept (this app's generator context has none) and its
// "Render center nails" cosmetic toggle (per the source's own documentation, it hides
// some interior petal nails from rendering without changing which strings are drawn —
// a pure display detail, not part of the pattern's shape).
function buildLotus(params: Extract<GeneratorParams, { patternId: "lotus" }>, ctx: GeneratorBuildContext): GeneratorBuildResult {
  const { sides, density, rotation, removeSections, renderCenter, centerRadius, radialColor } = params;
  const sections = lotusSectionsCount(sides);
  const removed = lotusRemovedSectionsCount(sides, removeSections);
  // Half of the board's max inscribed radius: the helper circle (petal centres) and
  // each petal circle share this same pre-fit radius, so a petal reaches from the
  // pattern's centre out to the board's own rim (docs/specs/32-generator-mode.md).
  const maxPetalRadius = ctx.maxRadius / 2;
  const fit = lotusFit(sides, density, maxPetalRadius, removed);

  const petalCenters: Point[] = Array.from({ length: sides }, (_, j) => lotusPetalCenter(sides, rotation, fit.radius, ctx.center, j));
  const petalPaths: PinPath[] = petalCenters.map((center, j) => {
    const points: Point[] = Array.from({ length: fit.N }, (_, k) => lotusPetalPoint(fit, sides, rotation, center, j, k));
    const pins: Pin[] = points.map((p) => ({ id: nextPinId(), ...p }));
    return {
      id: nextPathId(),
      geometry: { type: "freehand", points },
      requestedSpacing: fit.radius / Math.max(1, fit.N),
      actualSpacing: fit.radius / Math.max(1, fit.N),
      pins,
      guideVisible: ctx.pinStyle.guideVisible,
      colour: ctx.pinStyle.colour,
      diameter: ctx.pinStyle.diameter,
      symmetry: NO_SYMMETRY,
    };
  });

  // "Render center": off = no centre anchor at all; on with centerRadius=0 = a single
  // pin at the origin; on with centerRadius>0 = an s-nail centre circle sized as a
  // fraction of how far the outer patches actually reach in (lotusMaxCenterRadius).
  const hasCenterCircle = renderCenter && centerRadius > 0;
  let centerPath: PinPath | null = null;
  if (renderCenter) {
    const points: Point[] = hasCenterCircle
      ? Array.from({ length: sides }, (_, k) =>
          lotusCenterCirclePoint(sides, rotation, centerRadius * lotusMaxCenterRadius(fit, sides, rotation, ctx.center, sections, removed), ctx.center, k),
        )
      : [ctx.center];
    const pins: Pin[] = points.map((p) => ({ id: nextPinId(), ...p }));
    centerPath = {
      id: nextPathId(),
      geometry: { type: "freehand", points },
      requestedSpacing: Math.max(1e-6, fit.radius / sides),
      actualSpacing: Math.max(1e-6, fit.radius / sides),
      pins,
      guideVisible: ctx.pinStyle.guideVisible,
      colour: ctx.pinStyle.colour,
      diameter: ctx.pinStyle.diameter,
      symmetry: NO_SYMMETRY,
    };
  }

  const resolve = (node: LotusNode): string => {
    if (node.kind === "petal") return petalPaths[node.circle].pins[node.index].id;
    if (!centerPath) throw new Error("lotus: a centre node was generated without a centre pin path");
    return centerPath.pins[node.index].id;
  };

  const palette = ctx.threadDefaults.colours.length > 0 ? ctx.threadDefaults.colours : ["#5b8def"];
  const patches = lotusGeneratePatches(sides, removed, sections, renderCenter, radialColor);
  const threadPaths: ThreadPath[] = [];
  for (const patch of patches) {
    const { target, fan1, fan2 } = lotusDrawPatch(sides, fit.p, fit.N, removed, sections, hasCenterCircle, patch);
    const sources = [...fan1, ...fan2];
    if (sources.length === 0) continue;
    // One continuous Thread Path per patch: both fans converge on `target`, so the
    // thread revisits it between every consecutive source — a fan with more than 2
    // leaves has no single trail through it without retracing the shared point.
    // Visually identical to N disjoint segments (same straight lines, same pixels),
    // just grouped into one recolourable run per patch, this app's own established
    // "one Thread Path per shared colour" convention — at the cost of roughly
    // doubling the reported thread length for patches with more than 2 sources.
    const nodes: LotusNode[] = [];
    sources.forEach((source, i) => {
      if (i > 0) nodes.push(target);
      nodes.push(source);
    });
    const pinIds = nodes.map(resolve);
    if (pinIds.length < 2) continue;
    const colourIndex = lotusPatchColorIndex(patch, removed, radialColor);
    threadPaths.push(createThreadPath(pinIds, [palette[colourIndex % palette.length]], ctx.threadDefaults.width, ctx.threadDefaults.twistPitch));
  }

  const pinPaths = centerPath ? [...petalPaths, centerPath] : petalPaths;
  return { pinPaths, threadPaths };
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
  wave: "Wave",
  "hexagon-spades": "Hexagon Spades",
  "dance-of-planets": "Dance of Planets",
  sun: "Sun",
  vortex: "Vortex",
  polygon: "Polygon",
  flower: "Flower",
  assymetry: "Assymetry",
  spiral: "Spiral",
  "maurer-rose": "Maurer Rose",
  comet: "Comet",
  "flower-of-life": "Flower of Life",
  crosses: "Crosses",
  lotus: "Lotus",
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
    defaultParams: { patternId: "star", sideNails: 24, starPoints: 5, starOuterRatio: 1, starInnerRatio: 0, rotation: 0 },
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
  wave: {
    id: "wave",
    labelKey: "wave",
    defaultParams: { patternId: "wave", n: 180, base: 2, layers: 4, layerFill: 60, layerSpread: 15 },
  },
  "hexagon-spades": {
    id: "hexagon-spades",
    labelKey: "hexagonSpades",
    defaultParams: { patternId: "hexagon-spades", depth: 8, layerAngle: 0.05, rotation: 0, mirrorTiling: false },
  },
  "dance-of-planets": {
    id: "dance-of-planets",
    labelKey: "danceOfPlanets",
    defaultParams: {
      patternId: "dance-of-planets",
      outerType: "circle",
      outerNails: 120,
      outerSides: 6,
      innerType: "circle",
      innerNails: 60,
      innerSides: 6,
      innerSizeRatio: 0.4,
      rounds: 2,
      reverse: false,
      rotation: 0,
    },
  },
  sun: {
    id: "sun",
    labelKey: "sun",
    defaultParams: { patternId: "sun", sideNails: 50, starPoints: 16, starOuterRatio: 1, starInnerRatio: 0.15, rotation: Math.PI, layers: 4, layerSpread: 0.1625 },
  },
  vortex: {
    id: "vortex",
    labelKey: "vortex",
    defaultParams: { patternId: "vortex", sides: 4, nailsPerSide: 15, layers: 12, layerAngle: 0.05, rotation: 0 },
  },
  polygon: {
    id: "polygon",
    labelKey: "polygon",
    defaultParams: { patternId: "polygon", sides: 6, nailsPerSide: 20, bezierStep: 2, rotation: 0 },
  },
  flower: {
    id: "flower",
    labelKey: "flower",
    defaultParams: { patternId: "flower", sides: 6, nailsPerSide: 16, layers: 5, rotation: 0 },
  },
  assymetry: {
    id: "assymetry",
    labelKey: "assymetry",
    defaultParams: {
      patternId: "assymetry",
      circleNails: 137,
      layers: [
        { enabled: true, start: 0.25, end: 1, reverse: false },
        { enabled: true, start: 0.125, end: 0.888, reverse: false },
        { enabled: true, start: 0, end: 0.826, reverse: true },
      ],
      rotation: 0,
    },
  },
  spiral: {
    id: "spiral",
    labelKey: "spiral",
    defaultParams: { patternId: "spiral", n: 180, repetition: 4, innerLength: 70, rotation: 0 },
  },
  "maurer-rose": {
    id: "maurer-rose",
    labelKey: "maurerRose",
    defaultParams: { patternId: "maurer-rose", N: 7, maxSteps: 180, angleDegrees: 71, rotation: 0 },
  },
  comet: {
    id: "comet",
    labelKey: "comet",
    defaultParams: { patternId: "comet", n: 150, layers: 15, firstLayerSize: 70, layerDistance: 3, clusterStrength: 0.7, distortion: 0.38, rotation: 0 },
  },
  "flower-of-life": {
    id: "flower-of-life",
    labelKey: "flowerOfLife",
    defaultParams: { patternId: "flower-of-life", levels: 3, density: 6, rotation: 0, ringEnabled: true, ringNails: 144, ringBase: 2 },
  },
  crosses: {
    id: "crosses",
    labelKey: "crosses",
    defaultParams: { patternId: "crosses", nailsPerLine: 25, orientation: "vertical", gap: 0.27, sidesRotation: 0 },
  },
  lotus: {
    id: "lotus",
    labelKey: "lotus",
    defaultParams: { patternId: "lotus", sides: 18, density: 15, rotation: 0, removeSections: 4 / 7, renderCenter: true, centerRadius: 1, radialColor: false },
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
    case "wave":
      return buildWave(params, ctx);
    case "hexagon-spades":
      return buildHexagonSpades(params, ctx);
    case "dance-of-planets":
      return buildDanceOfPlanets(params, ctx);
    case "sun":
      return buildSun(params, ctx);
    case "vortex":
      return buildVortex(params, ctx);
    case "polygon":
      return buildPolygon(params, ctx);
    case "flower":
      return buildFlower(params, ctx);
    case "assymetry":
      return buildAssymetry(params, ctx);
    case "spiral":
      return buildSpiral(params, ctx);
    case "maurer-rose":
      return buildMaurerRose(params, ctx);
    case "comet":
      return buildComet(params, ctx);
    case "flower-of-life":
      return buildFlowerOfLife(params, ctx);
    case "crosses":
      return buildCrosses(params, ctx);
    case "lotus":
      return buildLotus(params, ctx);
  }
}
