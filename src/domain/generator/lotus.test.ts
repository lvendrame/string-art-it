import { describe, expect, it } from "vitest";
import {
  lotusColourGroupCount,
  lotusDrawPatch,
  lotusFit,
  lotusGeneratePatches,
  lotusGetStepCount,
  lotusMaxCenterRadius,
  lotusMaxRemovableSections,
  lotusPatchColorIndex,
  lotusPetalCenter,
  lotusPetalPoint,
  lotusCenterCirclePoint,
  lotusRemovedSectionsCount,
  lotusSectionsCount,
  type LotusFit,
} from "./lotus";

describe("lotusSectionsCount / lotusMaxRemovableSections", () => {
  it("sections = ceil(sides/2), removable = sections-3 floored at 0", () => {
    expect(lotusSectionsCount(18)).toBe(9);
    expect(lotusSectionsCount(17)).toBe(9);
    expect(lotusMaxRemovableSections(18)).toBe(6);
    expect(lotusMaxRemovableSections(6)).toBe(0);
    expect(lotusMaxRemovableSections(5)).toBe(0);
  });
});

describe("lotusRemovedSectionsCount", () => {
  it("rounds the 0..1 fraction into an integer capped at the removable count", () => {
    expect(lotusRemovedSectionsCount(18, 0)).toBe(0);
    expect(lotusRemovedSectionsCount(18, 1)).toBe(6);
    expect(lotusRemovedSectionsCount(18, 0.5)).toBe(3);
  });

  it("is always 0 when the shape has nothing removable (small sides)", () => {
    expect(lotusRemovedSectionsCount(5, 1)).toBe(0);
    expect(lotusRemovedSectionsCount(6, 0.7)).toBe(0);
  });
});

describe("lotusFit", () => {
  it("no removal: N=density*sides, p=floor(N/sides), radius unchanged, alpha=0", () => {
    const fit = lotusFit(18, 15, 30, 0);
    expect(fit).toEqual({ N: 270, p: 15, radius: 30, alpha: 0 });
  });

  it("removal enlarges the radius (fit >= 1) and produces a positive alpha", () => {
    const fit = lotusFit(18, 15, 30, 3);
    expect(fit.alpha).toBeCloseTo((3 * 2 * Math.PI) / 18, 10);
    expect(fit.radius).toBeGreaterThanOrEqual(30);
    expect(fit.N).toBeGreaterThan(0);
    expect(fit.p).toBeGreaterThanOrEqual(1);
  });

  it("more removed sections raises alpha further and never breaks p>=1 for a reasonably dense config", () => {
    const rmax = 6;
    for (let r = 1; r <= rmax; r += 1) {
      const fit = lotusFit(18, 15, 30, r);
      expect(fit.p).toBeGreaterThanOrEqual(1);
      expect(fit.N).toBeGreaterThan(0);
    }
  });
});

describe("lotusPetalCenter / lotusPetalPoint / lotusCenterCirclePoint", () => {
  const origin = { x: 5, y: -2 };

  it("petal centres sit exactly at the helper radius from the origin", () => {
    for (let j = 0; j < 18; j += 1) {
      const c = lotusPetalCenter(18, 0.3, 12, origin, j);
      expect(Math.hypot(c.x - origin.x, c.y - origin.y)).toBeCloseTo(12, 9);
    }
  });

  it("petal points sit exactly at the petal radius from their own petal centre (full circle)", () => {
    const fit: LotusFit = { N: 40, p: 4, radius: 10, alpha: 0 };
    const center = lotusPetalCenter(18, 0, fit.radius, origin, 2);
    for (let k = 0; k < fit.N; k += 1) {
      const p = lotusPetalPoint(fit, 18, 0, center, 2, k);
      expect(Math.hypot(p.x - center.x, p.y - center.y)).toBeCloseTo(fit.radius, 9);
    }
  });

  it("partial-arc petal points also sit exactly at the petal radius, and k=0/k=N-1 are the two arc endpoints", () => {
    const alpha = Math.PI / 3;
    const fit: LotusFit = { N: 20, p: 2, radius: 10, alpha };
    const center = { x: 0, y: 0 };
    const first = lotusPetalPoint(fit, 18, 0, center, 0, 0);
    const last = lotusPetalPoint(fit, 18, 0, center, 0, fit.N - 1);
    expect(Math.hypot(first.x, first.y)).toBeCloseTo(fit.radius, 9);
    expect(Math.hypot(last.x, last.y)).toBeCloseTo(fit.radius, 9);
    // The two arc ends are NOT the same point (alpha < pi means a real, non-degenerate gap).
    expect(Math.hypot(first.x - last.x, first.y - last.y)).toBeGreaterThan(0.01);
  });

  it("centre-circle points sit exactly at the given centre radius", () => {
    for (let k = 0; k < 18; k += 1) {
      const p = lotusCenterCirclePoint(18, 0.2, 4, origin, k);
      expect(Math.hypot(p.x - origin.x, p.y - origin.y)).toBeCloseTo(4, 9);
    }
  });

  it("lotusMaxCenterRadius returns a positive radius smaller than the petal radius", () => {
    const fit = lotusFit(18, 15, 30, 3);
    const sections = lotusSectionsCount(18);
    const removed = 3;
    const r = lotusMaxCenterRadius(fit, 18, 0, { x: 0, y: 0 }, sections, removed);
    expect(r).toBeGreaterThan(0);
    expect(r).toBeLessThan(fit.radius);
  });
});

describe("lotusGeneratePatches", () => {
  it("produces sides*(lastSection-removedSections) patches, side-major when radialColor is off", () => {
    const sides = 6;
    const removed = 0;
    const sections = lotusSectionsCount(sides); // 3
    const patches = lotusGeneratePatches(sides, removed, sections, true, false);
    // lastSection = sections - 1 = 2, so section in [0,2) => 2 sections per circle.
    expect(patches).toHaveLength(sides * 2);
    expect(patches[0]).toEqual({ circle: 0, section: 0 });
    expect(patches[1]).toEqual({ circle: 0, section: 1 });
    expect(patches[2]).toEqual({ circle: 1, section: 0 });
  });

  it("is section-major when radialColor is on, same total count", () => {
    const sides = 6;
    const sections = lotusSectionsCount(sides);
    const bySide = lotusGeneratePatches(sides, 0, sections, true, false);
    const bySection = lotusGeneratePatches(sides, 0, sections, true, true);
    expect(bySection).toHaveLength(bySide.length);
    expect(bySection[0]).toEqual({ circle: 0, section: 0 });
    expect(bySection[1]).toEqual({ circle: 1, section: 0 });
  });

  it("renderCenter=false generates one fewer section per circle", () => {
    const sides = 6;
    const sections = lotusSectionsCount(sides);
    const withCenter = lotusGeneratePatches(sides, 0, sections, true, false);
    const withoutCenter = lotusGeneratePatches(sides, 0, sections, false, false);
    expect(withoutCenter.length).toBe(withCenter.length - sides);
  });
});

describe("lotusPatchColorIndex / lotusColourGroupCount", () => {
  it("groups by circle when radialColor is off, by section (offset by removedSections) when on", () => {
    expect(lotusPatchColorIndex({ circle: 3, section: 5 }, 2, false)).toBe(3);
    expect(lotusPatchColorIndex({ circle: 3, section: 5 }, 2, true)).toBe(3);
  });

  it("colour group count matches sides (non-radial) or the section span (radial)", () => {
    const sides = 18;
    const sections = lotusSectionsCount(sides);
    expect(lotusColourGroupCount(sides, sections, 3, true, false)).toBe(sides);
    expect(lotusColourGroupCount(sides, sections, 3, true, true)).toBe(sections - 1 - 3);
  });
});

describe("lotusDrawPatch", () => {
  it("outer patch (section 0) fans p+p+1 sources toward the previous circle", () => {
    const sides = 18;
    const N = 200;
    const p = 11;
    const sections = lotusSectionsCount(sides);
    const { target, fan1, fan2 } = lotusDrawPatch(sides, p, N, 0, sections, false, { circle: 4, section: 0 });
    expect(target).toEqual({ kind: "petal", circle: 3, index: p * 2 });
    expect(fan1).toHaveLength(p);
    expect(fan2).toHaveLength(p + 1);
    for (const node of [...fan1, ...fan2]) {
      expect(node.kind).toBe("petal");
      if (node.kind === "petal") {
        expect(node.circle).toBe(4);
        expect(node.index).toBeGreaterThanOrEqual(0);
        expect(node.index).toBeLessThan(N);
      }
    }
  });

  it("middle patch fans p+1 sources from a different circle plus p sources from its own circle", () => {
    const sides = 18;
    const N = 200;
    const p = 11;
    const sections = lotusSectionsCount(sides); // 9
    const { target, fan1, fan2 } = lotusDrawPatch(sides, p, N, 0, sections, false, { circle: 4, section: 3 });
    expect(fan1).toHaveLength(p + 1);
    expect(fan2).toHaveLength(p);
    expect(target).toEqual({ kind: "petal", circle: 3, index: p * (3 + 2 - 0) });
    for (const node of fan1) expect(node.kind === "petal" && node.circle).toBe((4 + 3) % sides);
    for (const node of fan2) expect(node.kind === "petal" && node.circle).toBe(4);
  });

  it("the last generated section (renderCenter on) targets the centre", () => {
    const sides = 18;
    const N = 200;
    const p = 11;
    const sections = lotusSectionsCount(sides); // 9
    const lastSection = sections - 2; // 7, since lastSection-in-loop = sections-1=8 exclusive => max section 7
    const { target } = lotusDrawPatch(sides, p, N, 0, sections, true, { circle: 4, section: lastSection });
    expect(target).toEqual({ kind: "center", index: 4 });
  });

  it("the last generated section targets index 0 when there is no centre circle", () => {
    const sides = 18;
    const N = 200;
    const p = 11;
    const sections = lotusSectionsCount(sides);
    const lastSection = sections - 2;
    const { target } = lotusDrawPatch(sides, p, N, 0, sections, false, { circle: 4, section: lastSection });
    expect(target).toEqual({ kind: "center", index: 0 });
  });

  it("keeps every emitted index within [0, N) across a sweep of circles/sections, with and without removal", () => {
    const sides = 18;
    const density = 15;
    for (const removeFraction of [0, 0.3, 0.7, 1]) {
      const removed = lotusRemovedSectionsCount(sides, removeFraction);
      const fit = lotusFit(sides, density, 30, removed);
      const sections = lotusSectionsCount(sides);
      for (const renderCenter of [true, false]) {
        const patches = lotusGeneratePatches(sides, removed, sections, renderCenter, false);
        for (const patch of patches) {
          const { target, fan1, fan2 } = lotusDrawPatch(sides, fit.p, fit.N, removed, sections, renderCenter, patch);
          for (const node of [target, ...fan1, ...fan2]) {
            if (node.kind === "petal") {
              expect(node.circle).toBeGreaterThanOrEqual(0);
              expect(node.circle).toBeLessThan(sides);
              expect(node.index).toBeGreaterThanOrEqual(0);
              expect(node.index).toBeLessThan(fit.N);
            } else {
              expect(node.index).toBeGreaterThanOrEqual(0);
              expect(node.index).toBeLessThan(sides);
            }
          }
        }
      }
    }
  });
});

describe("lotusGetStepCount", () => {
  it("matches the sum of fan sizes across every generated patch (self-consistency, both colour orders)", () => {
    const sides = 18;
    const density = 15;
    const removed = lotusRemovedSectionsCount(sides, 0.5); // 3
    const fit = lotusFit(sides, density, 30, removed);
    const sections = lotusSectionsCount(sides);
    for (const radialColor of [false, true]) {
      const patches = lotusGeneratePatches(sides, removed, sections, true, radialColor);
      let total = 0;
      for (const patch of patches) {
        const { fan1, fan2 } = lotusDrawPatch(sides, fit.p, fit.N, removed, sections, true, patch);
        total += fan1.length + fan2.length;
      }
      expect(total).toBe(lotusGetStepCount(sides, fit.p, sections, removed));
    }
  });

  it("every fan is exactly 2p+1 sources", () => {
    const sides = 12;
    const p = 5;
    const N = 100;
    const sections = lotusSectionsCount(sides);
    const patches = lotusGeneratePatches(sides, 0, sections, true, false);
    for (const patch of patches) {
      const { fan1, fan2 } = lotusDrawPatch(sides, p, N, 0, sections, true, patch);
      expect(fan1.length + fan2.length).toBe(2 * p + 1);
    }
  });
});
