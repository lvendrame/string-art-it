// Procedural wood-grain geometry: filled, noise-perturbed growth-ring bands, generated
// from a distance field perturbed by seeded Perlin turbulence — the classic wood-texture
// technique (https://lodev.org/cgtutor/randomnoise.html#Wood):
//
//   dist    = sqrt((x-cx)^2 + (y-cy)^2) + turbPower * turbulence(x, y, turbSize)
//   sine    = |sin(2 * xyPeriod * dist * PI)|        // 0..1, continuous banding
//   colour  = mix(darkWood, lightWood, sine)
//
// Every pixel gets a colour from `sine` — it's a continuous banded fill, not thin lines
// drawn at a handful of radii. We reproduce that as a stack of solid filled annuli (each
// covering one small slice of the sine's 0..1..0 hump) rather than stroked contour rings,
// which is what actually reads as wood in the reference images. The rings are centred on
// the board (not offset) so every ring is a complete, unclipped band — no partial arcs.
//
// Rendered as plain vector paths (not an SVG filter) so the same geometry works in the live
// editor SVG, raster (PNG/video) export, and PDF export (svg2pdf.js has no filter support).
//
// All randomness is seeded by `presetId`, so a given preset always produces identical
// geometry — screen, re-render, and export stay visually consistent.

const FOCUS_X = 0.5;
const FOCUS_Y = 0.5;
const HUMP_COUNT = 13; // number of dark->light->dark ring cycles across the radius
const BANDS_PER_HUMP = 4; // solid sub-bands approximating each sine hump's gradient
const TURB_POWER_FRACTION = 2.2; // wobble as a fraction of one hump's width — organic, not circular
const TURB_SIZE = 0.35; // initial turbulence octave size
const RING_ANGLE_STEPS = 72;

export interface WoodGrainBand {
  d: string;
  colour: string;
}

export interface WoodGrainGeometry {
  bands: WoodGrainBand[];
}

/** mulberry32 seeded PRNG — returns a function producing floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable string -> uint32 seed (FNV-1a). */
export function hashSeed(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const GRAD = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1],
] as const;

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

/** Builds a seeded 2D Perlin noise function returning values roughly in [-1, 1]. */
function makeNoise2D(seed: number): (x: number, y: number) => number {
  const rand = mulberry32(seed);
  const perm = new Uint8Array(512);
  const base = new Uint8Array(256);
  for (let i = 0; i < 256; i++) base[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = base[i];
    base[i] = base[j];
    base[j] = tmp;
  }
  for (let i = 0; i < 512; i++) perm[i] = base[i & 255];

  return (x: number, y: number): number => {
    const xi = Math.floor(x) & 255;
    const yi = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = fade(xf);
    const v = fade(yf);

    const grad = (hash: number, gx: number, gy: number): number => {
      const g = GRAD[hash & 7];
      return g[0] * gx + g[1] * gy;
    };

    const aa = perm[perm[xi] + yi];
    const ab = perm[perm[xi] + yi + 1];
    const ba = perm[perm[xi + 1] + yi];
    const bb = perm[perm[xi + 1] + yi + 1];

    const x1 = lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u);
    const x2 = lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u);
    return lerp(x1, x2, v);
  };
}

/** fBm turbulence built from `noise2D`, normalized to roughly [-1, 1]. */
function makeTurbulence(noise2D: (x: number, y: number) => number) {
  return (x: number, y: number, size: number): number => {
    let value = 0;
    let s = size;
    const initialSize = size;
    while (s >= 1 / 32) {
      value += noise2D(x / s, y / s) * s;
      s /= 2;
    }
    return value / (2 * initialSize);
  };
}

function clampHex(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) => clampHex(v).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Interpolates two hex colours; `t` in [0, 1]. */
export function mixHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return rgbToHex(lerp(ar, br, t), lerp(ag, bg, t), lerp(ab, bb, t));
}

function maxCornerDistance(cx: number, cy: number): number {
  const corners: [number, number][] = [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ];
  return corners.reduce((max, [x, y]) => Math.max(max, Math.hypot(x - cx, y - cy)), 0);
}

function pointsToPathSegment(points: [number, number][]): string {
  return points.map(([x, y]) => `${x.toFixed(4)},${y.toFixed(4)}`).join(" L ");
}

/**
 * Traces the points of one iso-contour: the set of points where
 * `r + turbPower * turbulence(x, y, TURB_SIZE) = targetR`, sampled around the focal point
 * (the board's own centre, so every contour is a complete, evenly-clipped ring). Solved
 * with a couple of fixed-point iterations (turbPower is small relative to `targetR`, so
 * this converges quickly).
 */
function traceContourPoints(
  targetR: number,
  turbPower: number,
  turbulence: (x: number, y: number, size: number) => number,
): [number, number][] {
  const points: [number, number][] = [];
  for (let i = 0; i < RING_ANGLE_STEPS; i++) {
    const theta = (i / RING_ANGLE_STEPS) * Math.PI * 2;
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    let r = targetR;
    for (let iter = 0; iter < 3; iter++) {
      const x = FOCUS_X + r * cos;
      const y = FOCUS_Y + r * sin;
      r = targetR - turbPower * turbulence(x, y, TURB_SIZE);
    }
    points.push([FOCUS_X + r * cos, FOCUS_Y + r * sin]);
  }
  return points;
}

/** Solid filled disk (innermost band, no inner boundary). */
function diskPath(outer: [number, number][]): string {
  return `M ${pointsToPathSegment(outer)} Z`;
}

/** Solid filled annulus between an inner and outer contour (fill-rule evenodd). */
function annulusPath(outer: [number, number][], inner: [number, number][]): string {
  return `M ${pointsToPathSegment(outer)} Z M ${pointsToPathSegment(inner)} Z`;
}

// Geometry is a pure function of (presetId, colours), and BoardFillDefs is re-created on
// every render of every board/page instance (e.g. one per tiled print page) — cache it so
// repeated renders of the same preset don't re-run noise tracing from scratch.
const geometryCache = new Map<string, WoodGrainGeometry>();

/**
 * Builds filled, noise-perturbed ring-band vector geometry for a wood/paint preset.
 * Deterministic per `presetId`: same preset always yields identical paths.
 */
export function buildWoodGrainGeometry(
  presetId: string,
  colours: [string, string, string],
): WoodGrainGeometry {
  const cacheKey = `${presetId}|${colours.join(",")}`;
  const cached = geometryCache.get(cacheKey);
  if (cached) return cached;

  const seed = hashSeed(presetId);
  const noise2D = makeNoise2D(seed);
  const turbulence = makeTurbulence(noise2D);

  const [light, , dark] = colours;

  const maxR = maxCornerDistance(FOCUS_X, FOCUS_Y);
  const humpWidth = maxR / HUMP_COUNT;
  const turbPower = humpWidth * TURB_POWER_FRACTION;
  const subWidth = humpWidth / BANDS_PER_HUMP;
  const totalSubBands = HUMP_COUNT * BANDS_PER_HUMP;

  // Precompute each radius's contour once; band k uses contour[k] (inner) / contour[k+1] (outer).
  const contours: [number, number][][] = [];
  for (let k = 0; k <= totalSubBands; k++) {
    contours.push(traceContourPoints(k * subWidth, turbPower, turbulence));
  }

  const bands: WoodGrainBand[] = [];
  for (let idx = 0; idx < totalSubBands; idx++) {
    const phase = ((idx % BANDS_PER_HUMP) + 0.5) / BANDS_PER_HUMP; // 0..1 within this hump
    const brightness = Math.abs(Math.sin(phase * Math.PI)); // 0..1, matches |sin| banding
    const colour = mixHex(dark, light, brightness);
    const d = idx === 0 ? diskPath(contours[1]) : annulusPath(contours[idx + 1], contours[idx]);
    bands.push({ d, colour });
  }

  const geometry: WoodGrainGeometry = { bands };
  geometryCache.set(cacheKey, geometry);
  return geometry;
}
