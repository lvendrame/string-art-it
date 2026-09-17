import {
  asymmetryZigzag,
  cometLayerSequences,
  connectTwoSidesLocalIndices,
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
  twoRayZigzag,
  waveLayerSequences,
  type AsymmetryNode,
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
  | "lotus"
  | "crosses";

export interface FreestyleCircleParams {
  enabled: boolean;
  nails: number;
  radiusRatio: number; // of the board's max inscribed radius
  centerXRatio: number; // -1..1, of the board's max inscribed radius, offset from board centre
  centerYRatio: number;
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
  | { patternId: "vortex"; sides: number; layers: number; layerAngle: number; rotation: number }
  | { patternId: "polygon"; sides: number; nailsPerSide: number; bezierStep: number; rotation: number }
  | { patternId: "flower"; sides: number; nailsPerSide: number; layers: number; rotation: number }
  | { patternId: "assymetry"; circleNails: number; startFraction: number; endFraction: number; reverse: boolean; rotation: number }
  | { patternId: "spiral"; n: number; repetition: number; innerLength: number; rotation: number }
  | { patternId: "maurer-rose"; N: number; maxSteps: number; angleDegrees: number; rotation: number }
  | { patternId: "comet"; n: number; layers: number; firstLayerSize: number; distance: number; rotation: number }
  | { patternId: "flower-of-life"; depth: number; layerAngle: number; rotation: number; ringEnabled: boolean; ringNails: number; ringBase: number }
  | { patternId: "lotus"; sides: number; nailsPerCircle: number; radiusRatio: number; rotation: number }
  | { patternId: "crosses"; nailsPerLine: number; gap: number; rotation: number };

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
      return 1;
    case "spiral":
      return 1;
    case "maurer-rose":
      return 1;
    case "comet":
      return Math.max(1, params.layers);
    case "flower-of-life":
      return 18 + (params.ringEnabled ? 1 : 0);
    case "lotus":
      return params.sides;
    case "crosses":
      return 4;
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
  const triangleRadius = ctx.maxRadius * 0.5;
  const helperRadius = ctx.maxRadius - triangleRadius;
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

// Two concentric rings (circle or regular polygon, independently) round-robinned
// together (roundRobinSequence, reused as-is from Freestyle's own traversal) for
// `rounds` passes — repeating the same round-robin sequence `rounds` times densifies
// the weave instead of changing its shape, the same "repeat the base traversal" idea
// Spiral's own repetition parameter uses. `reverse` flips the inner ring's walking
// direction, which is what makes the two rings appear to counter-rotate against each
// other — the "planets" in the name.
function buildDanceOfPlanets(params: Extract<GeneratorParams, { patternId: "dance-of-planets" }>, ctx: GeneratorBuildContext): GeneratorBuildResult {
  const { outerType, outerNails, outerSides, innerType, innerNails, innerSides, innerSizeRatio, rounds, reverse, rotation } = params;
  const outerPath = buildRingPinPath(outerType, outerSides, ctx.maxRadius, rotation, ctx.center, ctx, outerNails);
  const innerPath = buildRingPinPath(innerType, innerSides, ctx.maxRadius * innerSizeRatio, rotation, ctx.center, ctx, innerNails);
  const outerCount = outerPath.pins.length;
  const innerCount = innerPath.pins.length;
  const oneRound = roundRobinSequence([outerCount, innerCount]);
  const pinIds: string[] = [];
  for (let r = 0; r < Math.max(1, rounds); r += 1) {
    for (const step of oneRound) {
      if (step.groupIndex === 0) pinIds.push(outerPath.pins[step.localIndex].id);
      else pinIds.push(innerPath.pins[reverse ? innerCount - 1 - step.localIndex : step.localIndex].id);
    }
  }
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
  for (let layer = 1; layer <= layers; layer += 1) {
    const ratio = Math.max(0.05, starOuterRatio * (1 - layerSpread * layer));
    const radius = ctx.maxRadius * ratio;
    const geometry: PinPathGeometry = { type: "circle", center: ctx.center, radius };
    const spacing = spacingForPinCount(circlePerimeter(radius), sideNails);
    const ringPath = createPinPath(geometry, spacing, ctx.pinStyle);
    const ringLayer = mandalaLayerSequences(sideNails, 2, 1)[0];
    const ringThread = createThreadPath(
      ringLayer.localIndices.map((i) => ringPath.pins[i].id),
      [palette[threadPaths.length % palette.length]],
      ctx.threadDefaults.width,
      ctx.threadDefaults.twistPitch,
    );
    pinPaths.push(ringPath);
    threadPaths.push(ringThread);
  }
  return { pinPaths, threadPaths };
}

// Vortex — a single nested-polygon spiral (nestedPolygonLevels/nestedPolygonVertices,
// the same primitive Star of David's tiles use), simplified to corners-only: each level
// threads as its own closed polygon OUTLINE, not per-edge subdivided fill (the plan's
// stated simplification — the real pattern densifies per edge too).
function buildVortex(params: Extract<GeneratorParams, { patternId: "vortex" }>, ctx: GeneratorBuildContext): GeneratorBuildResult {
  const { sides, layers, layerAngle, rotation } = params;
  const levels = nestedPolygonLevels(sides, ctx.maxRadius, rotation, layerAngle, layers, 1);
  const points = nestedPolygonVertices(ctx.center, sides, levels);
  const pins: Pin[] = points.map((p) => ({ id: nextPinId(), ...p }));
  const pinPath: PinPath = {
    id: nextPathId(),
    geometry: { type: "freehand", points },
    requestedSpacing: ctx.maxRadius / Math.max(1, layers),
    actualSpacing: ctx.maxRadius / Math.max(1, layers),
    pins,
    guideVisible: ctx.pinStyle.guideVisible,
    colour: ctx.pinStyle.colour,
    diameter: ctx.pinStyle.diameter,
    symmetry: NO_SYMMETRY,
  };
  const palette = ctx.threadDefaults.colours.length > 0 ? ctx.threadDefaults.colours : ["#5b8def"];
  const threadPaths: ThreadPath[] = [];
  for (let level = 0; level < levels.length; level += 1) {
    const base = level * sides;
    const pinIds = Array.from({ length: sides + 1 }, (_, i) => pins[base + (i % sides)].id);
    threadPaths.push(createThreadPath(pinIds, [palette[threadPaths.length % palette.length]], ctx.threadDefaults.width, ctx.threadDefaults.twistPitch));
  }
  return { pinPaths: [pinPath], threadPaths };
}

// Shared by Polygon and Flower: one `regular-polygon` PinPath (sides*nailsPerSide pins,
// vertex-anchored — side s's pins are local indices s*nailsPerSide..s*nailsPerSide+
// nailsPerSide-1), curve-stitched (twoRayZigzag, src/domain/generator/rayZigzag.ts)
// between side s and side (s+bezierStep)%sides, one Thread Path per side.
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
    const pinIds = twoRayZigzag(nailsPerSide, nailsPerSide).map(resolve);
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
function buildFlower(params: Extract<GeneratorParams, { patternId: "flower" }>, ctx: GeneratorBuildContext): GeneratorBuildResult {
  const { sides, nailsPerSide, layers, rotation } = params;
  const pinPaths: PinPath[] = [];
  const threadPaths: ThreadPath[] = [];
  for (let layer = 0; layer < layers; layer += 1) {
    const layerRotation = rotation + (layer * 2 * Math.PI) / (sides * Math.max(1, layers));
    const built = buildPolygonCore(sides, nailsPerSide, 2, layerRotation, ctx, threadPaths.length);
    pinPaths.push(built.pinPath);
    threadPaths.push(...built.threadPaths);
  }
  return { pinPaths, threadPaths };
}

// Assymetry — 1 circle + 1 spoke line (the same line-geometry construction buildStar
// uses for its own spokes), woven by asymmetryZigzag's combined-index-space zigzag —
// simplified to a single configurable pass (startFraction/endFraction/reverse)
// instead of the researched pattern's 3 parallel default passes.
function buildAssymetry(params: Extract<GeneratorParams, { patternId: "assymetry" }>, ctx: GeneratorBuildContext): GeneratorBuildResult {
  const { circleNails, startFraction, endFraction, reverse, rotation } = params;
  const circleGeometry: PinPathGeometry = { type: "circle", center: ctx.center, radius: ctx.maxRadius };
  const circleSpacing = spacingForPinCount(circlePerimeter(ctx.maxRadius), circleNails);
  const circlePath = createPinPath(circleGeometry, circleSpacing, ctx.pinStyle);

  const end: Point = { x: ctx.center.x + ctx.maxRadius * Math.cos(rotation), y: ctx.center.y + ctx.maxRadius * Math.sin(rotation) };
  const spokeGeometry: PinPathGeometry = { type: "line", start: ctx.center, end };
  const spokeSpacing = spacingForPinCount(ctx.maxRadius, Math.max(1, circleNails - 1));
  const spokePath = createPinPath(spokeGeometry, spokeSpacing, ctx.pinStyle);

  const resolve = (node: AsymmetryNode): string => (node.which === "circle" ? circlePath.pins[node.index].id : spokePath.pins[node.index].id);
  const pinIds = asymmetryZigzag(circleNails, circleNails, startFraction, endFraction, reverse).map(resolve);
  const threadPath = createThreadPath(pinIds, ctx.threadDefaults.colours, ctx.threadDefaults.width, ctx.threadDefaults.twistPitch);
  return { pinPaths: [circlePath, spokePath], threadPaths: pinIds.length >= 2 ? [threadPath] : [] };
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

// Comet — one circle, `layers` offset-alternation passes (cometLayerSequences) whose
// offset and run length both shrink per layer, giving the accumulated result a
// tapering "tail". `rotation` applied as an index shift, same rationale as Spiral.
function buildComet(params: Extract<GeneratorParams, { patternId: "comet" }>, ctx: GeneratorBuildContext): GeneratorBuildResult {
  const { n, layers, firstLayerSize, distance, rotation } = params;
  const geometry: PinPathGeometry = { type: "circle", center: ctx.center, radius: ctx.maxRadius };
  const spacing = spacingForPinCount(circlePerimeter(ctx.maxRadius), n);
  const pinPath = createPinPath(geometry, spacing, ctx.pinStyle);
  const shift = Math.round((rotation / (2 * Math.PI)) * n);
  const palette = ctx.threadDefaults.colours.length > 0 ? ctx.threadDefaults.colours : ["#5b8def"];
  const layerSeqs = cometLayerSequences(n, layers, firstLayerSize, distance);
  const threadPaths = layerSeqs.map((layer, i) =>
    createThreadPath(
      layer.localIndices.map((idx) => pinPath.pins[((idx + shift) % n + n) % n].id),
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
function buildFlowerOfLife(params: Extract<GeneratorParams, { patternId: "flower-of-life" }>, ctx: GeneratorBuildContext): GeneratorBuildResult {
  const { depth, layerAngle, rotation, ringEnabled, ringNails, ringBase } = params;
  const triangleRadius = ctx.maxRadius * 0.5;
  const helperRadius = ctx.maxRadius - triangleRadius;
  const tiles = tileRingLayout(6, 3, helperRadius, Math.PI / 6, rotation, ctx.center, false);
  const base = buildTileFans(tiles, () => triangleRadius, layerAngle, depth, ctx);
  if (!ringEnabled) return base;

  const ringGeometry: PinPathGeometry = { type: "circle", center: ctx.center, radius: ctx.maxRadius };
  const ringSpacing = spacingForPinCount(circlePerimeter(ctx.maxRadius), ringNails);
  const ringPath = createPinPath(ringGeometry, ringSpacing, ctx.pinStyle);
  const ringLayer = mandalaLayerSequences(ringNails, ringBase, 1)[0];
  const palette = ctx.threadDefaults.colours.length > 0 ? ctx.threadDefaults.colours : ["#5b8def"];
  const ringThread = createThreadPath(
    ringLayer.localIndices.map((i) => ringPath.pins[i].id),
    [palette[base.threadPaths.length % palette.length]],
    ctx.threadDefaults.width,
    ctx.threadDefaults.twistPitch,
  );
  return { pinPaths: [...base.pinPaths, ringPath], threadPaths: [...base.threadPaths, ringThread] };
}

// Lotus — `sides` circles placed evenly around a helper circle (the same circle-
// placement idea Freestyle uses, arranged evenly here instead of freely), round-
// robinned (roundRobinSequence, reused as-is) per ADJACENT PAIR of circles rather than
// all circles together like Freestyle — that's what keeps each "petal" a distinct
// Thread Path instead of one traversal through every circle. Simplified: no centre-
// point patch handling, no "remove sections" control.
function buildLotus(params: Extract<GeneratorParams, { patternId: "lotus" }>, ctx: GeneratorBuildContext): GeneratorBuildResult {
  const { sides, nailsPerCircle, radiusRatio, rotation } = params;
  const placementRadius = ctx.maxRadius * radiusRatio;
  const circleRadius = Math.max(ctx.maxRadius * 0.05, ctx.maxRadius - placementRadius);
  const circles: PinPath[] = [];
  for (let i = 0; i < sides; i += 1) {
    const angle = rotation + (i * 2 * Math.PI) / sides;
    const center: Point = { x: ctx.center.x + placementRadius * Math.cos(angle), y: ctx.center.y + placementRadius * Math.sin(angle) };
    const geometry: PinPathGeometry = { type: "circle", center, radius: circleRadius };
    const spacing = spacingForPinCount(circlePerimeter(circleRadius), nailsPerCircle);
    circles.push(createPinPath(geometry, spacing, ctx.pinStyle));
  }
  const palette = ctx.threadDefaults.colours.length > 0 ? ctx.threadDefaults.colours : ["#5b8def"];
  const threadPaths: ThreadPath[] = [];
  for (let i = 0; i < sides; i += 1) {
    const a = circles[i];
    const b = circles[(i + 1) % sides];
    const sequence = roundRobinSequence([a.pins.length, b.pins.length]);
    const pinIds = sequence.map((step) => (step.groupIndex === 0 ? a.pins[step.localIndex].id : b.pins[step.localIndex].id));
    threadPaths.push(createThreadPath(pinIds, [palette[threadPaths.length % palette.length]], ctx.threadDefaults.width, ctx.threadDefaults.twistPitch));
  }
  return { pinPaths: circles, threadPaths };
}

// Crosses — an original, simplified 4-line "#" grid (2 lines each "direction", reusing
// the same line-geometry construction as Assymetry/Star spokes), curve-stitched
// (twoRayZigzag) across each of the 4 crossing pairs — NOT the researched pattern's
// exact 10-line (4 long + 6 crossbar) fixed arrangement, a deliberate simplification
// stated plainly (docs/specs/32-generator-mode.md), same precedent as this milestone's
// other simplified patterns.
function buildCrosses(params: Extract<GeneratorParams, { patternId: "crosses" }>, ctx: GeneratorBuildContext): GeneratorBuildResult {
  const { nailsPerLine, gap, rotation } = params;
  const offset = ctx.maxRadius * gap;
  const rotatePoint = (p: Point): Point => {
    const dx = p.x - ctx.center.x;
    const dy = p.y - ctx.center.y;
    return {
      x: ctx.center.x + dx * Math.cos(rotation) - dy * Math.sin(rotation),
      y: ctx.center.y + dx * Math.sin(rotation) + dy * Math.cos(rotation),
    };
  };
  const makeLine = (start: Point, end: Point): PinPath => {
    const geometry: PinPathGeometry = { type: "line", start: rotatePoint(start), end: rotatePoint(end) };
    const length = Math.hypot(end.x - start.x, end.y - start.y);
    const spacing = spacingForPinCount(length, Math.max(1, nailsPerLine - 1));
    return createPinPath(geometry, spacing, ctx.pinStyle);
  };
  const v1 = makeLine({ x: ctx.center.x - offset, y: ctx.center.y - ctx.maxRadius }, { x: ctx.center.x - offset, y: ctx.center.y + ctx.maxRadius });
  const v2 = makeLine({ x: ctx.center.x + offset, y: ctx.center.y - ctx.maxRadius }, { x: ctx.center.x + offset, y: ctx.center.y + ctx.maxRadius });
  const h1 = makeLine({ x: ctx.center.x - ctx.maxRadius, y: ctx.center.y - offset }, { x: ctx.center.x + ctx.maxRadius, y: ctx.center.y - offset });
  const h2 = makeLine({ x: ctx.center.x - ctx.maxRadius, y: ctx.center.y + offset }, { x: ctx.center.x + ctx.maxRadius, y: ctx.center.y + offset });
  const pinPaths = [v1, v2, h1, h2];
  const palette = ctx.threadDefaults.colours.length > 0 ? ctx.threadDefaults.colours : ["#5b8def"];
  const threadPaths: ThreadPath[] = [];
  const pairs: [PinPath, PinPath][] = [
    [v1, h1],
    [v1, h2],
    [v2, h1],
    [v2, h2],
  ];
  for (const [a, b] of pairs) {
    const resolve = (node: RayZigzagNode): string => (node.which === "A" ? a : b).pins[node.index].id;
    const pinIds = twoRayZigzag(a.pins.length, b.pins.length).map(resolve);
    threadPaths.push(createThreadPath(pinIds, [palette[threadPaths.length % palette.length]], ctx.threadDefaults.width, ctx.threadDefaults.twistPitch));
  }
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
  lotus: "Lotus",
  crosses: "Crosses",
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
    defaultParams: { patternId: "sun", sideNails: 20, starPoints: 8, starOuterRatio: 1, starInnerRatio: 0, rotation: 0, layers: 3, layerSpread: 0.12 },
  },
  vortex: {
    id: "vortex",
    labelKey: "vortex",
    defaultParams: { patternId: "vortex", sides: 6, layers: 12, layerAngle: 0.05, rotation: 0 },
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
    defaultParams: { patternId: "assymetry", circleNails: 120, startFraction: 0, endFraction: 1, reverse: false, rotation: 0 },
  },
  spiral: {
    id: "spiral",
    labelKey: "spiral",
    defaultParams: { patternId: "spiral", n: 180, repetition: 3, innerLength: 4, rotation: 0 },
  },
  "maurer-rose": {
    id: "maurer-rose",
    labelKey: "maurerRose",
    defaultParams: { patternId: "maurer-rose", N: 7, maxSteps: 180, angleDegrees: 71, rotation: 0 },
  },
  comet: {
    id: "comet",
    labelKey: "comet",
    defaultParams: { patternId: "comet", n: 150, layers: 15, firstLayerSize: 40, distance: 20, rotation: 0 },
  },
  "flower-of-life": {
    id: "flower-of-life",
    labelKey: "flowerOfLife",
    defaultParams: { patternId: "flower-of-life", depth: 8, layerAngle: 0.05, rotation: 0, ringEnabled: true, ringNails: 180, ringBase: 2 },
  },
  lotus: {
    id: "lotus",
    labelKey: "lotus",
    defaultParams: { patternId: "lotus", sides: 6, nailsPerCircle: 60, radiusRatio: 0.5, rotation: 0 },
  },
  crosses: {
    id: "crosses",
    labelKey: "crosses",
    defaultParams: { patternId: "crosses", nailsPerLine: 40, gap: 0.15, rotation: 0 },
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
    case "lotus":
      return buildLotus(params, ctx);
    case "crosses":
      return buildCrosses(params, ctx);
  }
}
