import type { Point } from "../paths";

// docs/specs/32-generator-mode.md Lotus pattern — `sides` overlapping "petal" circles
// arranged around a helper circle, each carrying its own arc of nails; strings fan out
// from a range of nails on one petal circle to a single shared target nail on the
// previous petal (or the pattern's centre for the innermost ring). Re-derived as
// original functions/naming from a math write-up of the reference implementation
// (~/projects/pocs/research_string_art/docs/lotus-pattern-generation.md and
// vendor/string_art/.../Lotus.pattern.ts, both pre-existing read-only research
// artifacts) — this app's own (circle, localIndex)/"centre" node addressing, not
// copied code. Two earlier attempts at this pattern were abandoned as visually wrong
// even after implementing this same source's index arithmetic; this version keeps
// every step as a small, independently-testable pure function specifically so the
// traversal can be checked for internal consistency (see lotus.test.ts) rather than
// judged by eye alone.

export interface LotusFit {
  N: number; // fitted nail count per petal circle (density*sides before any removal)
  p: number; // nails per section, floor(N / (sides - 2*removedSections))
  radius: number; // fitted petal-circle AND helper-circle radius (both share one value)
  alpha: number; // half-angle excluded from each petal circle's arc; 0 = full circle
}

export function lotusSectionsCount(sides: number): number {
  return Math.ceil(sides / 2);
}

// The "Remove sections" control's displayed integer range is 0..this value. Small
// `sides` (<=6) makes this 0, disabling removal entirely rather than dividing by zero
// for a UI step size — the source's own control config leaves this exact case as a
// documented caveat (research doc §Discrete implementation caveats).
export function lotusMaxRemovableSections(sides: number): number {
  return Math.max(0, lotusSectionsCount(sides) - 3);
}

export function lotusRemovedSectionsCount(sides: number, removeSections: number): number {
  const rmax = lotusMaxRemovableSections(sides);
  if (rmax <= 0) return 0;
  return Math.min(rmax, Math.round(removeSections * rmax));
}

// Removing sections shrinks the visible top arc of each petal circle, so the source
// enlarges ("fits") the whole construction back up to the original radius: `alpha` is
// the resulting half-angle gap, `fit` the resulting radius/nail-count scale-up. This
// app has no canvas-margin concept (unlike the reference's absolute-pixel margin), so
// margin is dropped (m=0) — algebraically the fit ratio doesn't depend on radius or
// margin once m=0 anyway, only on `alpha`.
export function lotusFit(sides: number, density: number, maxPetalRadius: number, removedSections: number): LotusFit {
  const n0 = density * sides;
  if (removedSections <= 0) {
    return { N: n0, p: Math.floor(n0 / sides), radius: maxPetalRadius, alpha: 0 };
  }
  const alpha = removedSections * ((2 * Math.PI) / sides);
  const topSectionHeight = 2 * maxPetalRadius * Math.sin((Math.PI - alpha) / 2);
  const fit = (2 * maxPetalRadius) / topSectionHeight;
  const scaled = n0 * fit;
  const fullCircleFit = Math.max(sides, scaled - (scaled % sides));
  const N = Math.round(fullCircleFit * (1 - (2 * removedSections) / sides) + 1);
  const p = Math.floor(N / (sides - 2 * removedSections));
  return { N, p, radius: maxPetalRadius * fit, alpha };
}

// Petal circle j's own centre, sitting on the helper circle at the fitted radius.
// Index zero points straight down, increasing clockwise (sin for x, cos for y) —
// matches the reference's own circle-point convention throughout.
export function lotusPetalCenter(sides: number, rotation: number, helperRadius: number, origin: Point, j: number): Point {
  const angle = (2 * Math.PI * j) / sides - rotation;
  return { x: origin.x + helperRadius * Math.sin(angle), y: origin.y + helperRadius * Math.cos(angle) };
}

// Local nail `k` (0..fit.N-1) on petal circle `j`. A partial arc (`fit.alpha > 0`)
// divides by N-1 instead of N so BOTH exposed ends of the arc land on real nails.
export function lotusPetalPoint(fit: LotusFit, sides: number, rotation: number, petalCenter: Point, j: number, k: number): Point {
  const baseAngle = fit.alpha > 0 ? fit.alpha + (2 * Math.PI - 2 * fit.alpha) * (k / (fit.N - 1)) : (2 * Math.PI * k) / fit.N;
  const angle = baseAngle - rotation + (2 * Math.PI * j) / sides;
  return { x: petalCenter.x + fit.radius * Math.sin(angle), y: petalCenter.y + fit.radius * Math.cos(angle) };
}

// The optional s-nail centre circle ("Render center" on, "Center radius" > 0). Its
// rotation carries a fixed odd/even-sides offset so its points land flush against the
// innermost petal points instead of at an arbitrary angle.
export function lotusCenterCirclePoint(sides: number, rotation: number, centerRadius: number, origin: Point, k: number): Point {
  const centerRotation = rotation - (Math.PI * Math.ceil((sides - 4) / 2)) / sides;
  const angle = (2 * Math.PI * k) / sides - centerRotation;
  return { x: origin.x + centerRadius * Math.sin(angle), y: origin.y + centerRadius * Math.cos(angle) };
}

// The natural radius for the centre circle when "Center radius" is a fraction (0..1):
// the distance from the origin out to the innermost point the outer patches actually
// reach, scaled down by that fraction.
export function lotusMaxCenterRadius(fit: LotusFit, sides: number, rotation: number, origin: Point, sections: number, removedSections: number): number {
  const petalCenter0 = lotusPetalCenter(sides, rotation, fit.radius, origin, 0);
  const k = (sections - 1 - removedSections) * fit.p;
  const point = lotusPetalPoint(fit, sides, rotation, petalCenter0, 0, k);
  return Math.hypot(point.x - origin.x, point.y - origin.y);
}

export type LotusNode = { kind: "petal"; circle: number; index: number } | { kind: "center"; index: number };

export interface LotusPatch {
  circle: number;
  section: number;
}

// One entry per (petal circle, section) pair actually drawn. `radialColor` changes the
// emission order (grouped by section vs. by circle, which changes how colours group —
// see lotusPatchColorIndex) but not the set of patches itself.
export function lotusGeneratePatches(sides: number, removedSections: number, sections: number, renderCenter: boolean, radialColor: boolean): LotusPatch[] {
  const lastSection = sections - (renderCenter ? 1 : 2);
  const patches: LotusPatch[] = [];
  if (radialColor) {
    for (let section = removedSections; section < lastSection; section += 1) {
      for (let circle = 0; circle < sides; circle += 1) patches.push({ circle, section });
    }
  } else {
    for (let circle = 0; circle < sides; circle += 1) {
      for (let section = removedSections; section < lastSection; section += 1) patches.push({ circle, section });
    }
  }
  return patches;
}

// Which colour group a patch belongs to: by petal circle (the default — every section
// of a given circle shares one colour), or by section when `radialColor` is on (docs/
// specs/32-generator-mode.md §Multicolor).
export function lotusPatchColorIndex(patch: LotusPatch, removedSections: number, radialColor: boolean): number {
  return radialColor ? patch.section - removedSections : patch.circle;
}

// How many distinct colour groups the current params can actually produce.
export function lotusColourGroupCount(sides: number, sections: number, removedSections: number, renderCenter: boolean, radialColor: boolean): number {
  if (!radialColor) return sides;
  const lastSection = sections - (renderCenter ? 1 : 2);
  return Math.max(1, lastSection - removedSections);
}

// The two source fans of one patch, both converging on a single shared `target` node.
// Section 0 (only reachable when nothing is removed) is the "outer" case: the current
// circle's own two arc ends fan toward the previous circle. Every other section fans a
// nail range on a DIFFERENT circle (`(circle+section) % sides`) plus a nail range on
// its own circle, both toward the previous circle — except the innermost generated
// section, which targets the centre instead.
export function lotusDrawPatch(sides: number, p: number, N: number, removedSections: number, sections: number, hasCenterCircle: boolean, patch: LotusPatch): { target: LotusNode; fan1: LotusNode[]; fan2: LotusNode[] } {
  const { circle, section } = patch;
  const prevCircle = circle === 0 ? sides - 1 : circle - 1;
  const petal = (c: number, index: number): LotusNode => ({ kind: "petal", circle: c, index });

  if (section === 0) {
    const target = petal(prevCircle, p * 2);
    const fan1: LotusNode[] = [];
    for (let i = N - p; i < N; i += 1) fan1.push(petal(circle, i));
    const fan2: LotusNode[] = [];
    for (let i = 0; i <= p; i += 1) fan2.push(petal(circle, i));
    return { target, fan1, fan2 };
  }

  const isLastSection = section === sections - 2;
  const target: LotusNode = isLastSection ? { kind: "center", index: hasCenterCircle ? circle : 0 } : petal(prevCircle, p * (section + 2 - removedSections));

  const firstCircle = (circle + section) % sides;
  const firstCircleStart = N - (section + 1 - removedSections) * p - (removedSections > 0 ? 1 : 0);
  const fan1: LotusNode[] = [];
  for (let i = 0; i <= p; i += 1) fan1.push(petal(firstCircle, firstCircleStart + i));

  const startIndex = (section - removedSections) * p + 1;
  const fan2: LotusNode[] = [];
  for (let i = startIndex; i < startIndex + p; i += 1) fan2.push(petal(circle, i));

  return { target, fan1, fan2 };
}

// Reference closed-form step count (sides * (2p+1) * (sections-removedSections-1)) —
// used to sanity-check lotusGeneratePatches/lotusDrawPatch against the source's own
// total, independent of however this app groups individual source→target segments
// into Thread Paths for rendering.
export function lotusGetStepCount(sides: number, p: number, sections: number, removedSections: number): number {
  return sides * (2 * p + 1) * (sections - removedSections - 1);
}
