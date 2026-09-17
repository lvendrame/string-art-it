import { describe, expect, it } from "vitest";
import { buildGeneratorPattern, GENERATOR_PATTERNS, maxGeneratorColours, maxInscribedRadius, type GeneratorBuildContext, type GeneratorParams } from "./generatorPatterns";
import { createDefaultBoard } from "../board";

const ctx: GeneratorBuildContext = {
  center: { x: 0, y: 0 },
  maxRadius: 20,
  pinStyle: { colour: "#f2ede4", diameter: 2, guideVisible: true },
  threadDefaults: { colours: ["#5b8def"], width: 1.5, twistPitch: 6 },
};

describe("maxInscribedRadius", () => {
  it("returns half the diameter for the default circle board", () => {
    expect(maxInscribedRadius(createDefaultBoard())).toBe(30);
  });

  it("returns the smaller half-dimension for an oval/rectangle board", () => {
    expect(maxInscribedRadius({ shape: "oval", dimensions: { width: 60, height: 40 }, appearance: { type: "solid", colour: "#fff" } })).toBe(20);
    expect(maxInscribedRadius({ shape: "rectangle", dimensions: { width: 60, height: 40 }, appearance: { type: "solid", colour: "#fff" } })).toBe(20);
  });
});

describe("buildGeneratorPattern — mandala", () => {
  it("produces exactly n pins on one circle and layers thread paths of 2n indices each", () => {
    const result = buildGeneratorPattern({ patternId: "mandala", n: 60, base: 7, layers: 3 }, ctx);
    expect(result.pinPaths).toHaveLength(1);
    expect(result.pinPaths[0].pins).toHaveLength(60);
    expect(result.threadPaths).toHaveLength(3);
    for (const t of result.threadPaths) expect(t.pinIds).toHaveLength(120);
  });

  it("every emitted pin id is a real id from the generated pin path", () => {
    const result = buildGeneratorPattern({ patternId: "mandala", n: 24, base: 5, layers: 1 }, ctx);
    const validIds = new Set(result.pinPaths[0].pins.map((p) => p.id));
    for (const id of result.threadPaths[0].pinIds) expect(validIds.has(id)).toBe(true);
  });

  it("cycles each layer's colour through the palette (docs/specs/32-generator-mode.md §Multicolor)", () => {
    const multiColourCtx: GeneratorBuildContext = { ...ctx, threadDefaults: { ...ctx.threadDefaults, colours: ["#111111", "#222222"] } };
    const result = buildGeneratorPattern({ patternId: "mandala", n: 20, base: 3, layers: 5 }, multiColourCtx);
    expect(result.threadPaths.map((t) => t.colours)).toEqual([["#111111"], ["#222222"], ["#111111"], ["#222222"], ["#111111"]]);
  });
});

describe("buildGeneratorPattern — star", () => {
  it("produces a circle pin path + a star pin path, and a single thread weaving both", () => {
    const result = buildGeneratorPattern({ patternId: "star", circleNails: 100, starPoints: 5, starOuterRatio: 1, starInnerRatio: 0.4, rotation: 0 }, ctx);
    expect(result.pinPaths).toHaveLength(2);
    expect(result.pinPaths[0].geometry.type).toBe("circle");
    expect(result.pinPaths[0].pins).toHaveLength(100);
    expect(result.pinPaths[1].geometry.type).toBe("star");
    // 2*points congruent edges, 20 nails/edge (round(100/5))
    expect(result.pinPaths[1].pins).toHaveLength(2 * 5 * 20);
    expect(result.threadPaths).toHaveLength(1);
    const allIds = new Set([...result.pinPaths[0].pins, ...result.pinPaths[1].pins].map((p) => p.id));
    for (const id of result.threadPaths[0].pinIds) expect(allIds.has(id)).toBe(true);
  });
});

describe("buildGeneratorPattern — freestyle", () => {
  it("builds one pin path per enabled circle and round-robins the thread across them", () => {
    const result = buildGeneratorPattern(
      {
        patternId: "freestyle",
        circles: [
          { enabled: true, nails: 10, radiusRatio: 0.5, centerXRatio: 0, centerYRatio: 0 },
          { enabled: false, nails: 10, radiusRatio: 0.5, centerXRatio: 0, centerYRatio: 0 },
          { enabled: true, nails: 6, radiusRatio: 0.3, centerXRatio: 0.5, centerYRatio: 0.5 },
        ],
      },
      ctx,
    );
    expect(result.pinPaths).toHaveLength(2);
    expect(result.pinPaths[0].pins).toHaveLength(10);
    expect(result.pinPaths[1].pins).toHaveLength(6);
    // rounds = max(10,6) = 10, 2 enabled circles per round
    expect(result.threadPaths[0].pinIds).toHaveLength(20);
  });
});

describe("buildGeneratorPattern — star-of-david", () => {
  it("builds 7 tiles (1 central hexagon + 6 triangles), each nested `depth` levels deep", () => {
    const depth = 4;
    const result = buildGeneratorPattern({ patternId: "star-of-david", depth, layerAngle: 0.063, rotation: 0, mirrorTiling: false }, ctx);
    expect(result.pinPaths).toHaveLength(7);
    expect(result.pinPaths[0].pins).toHaveLength(6 * depth); // central hexagon
    for (const triangle of result.pinPaths.slice(1)) expect(triangle.pins).toHaveLength(3 * depth);
  });

  it("threads one adjacent-side fan per tile side: 6 (hexagon) + 6*3 (triangles) = 24 Thread Paths", () => {
    const depth = 5;
    const result = buildGeneratorPattern({ patternId: "star-of-david", depth, layerAngle: 0.063, rotation: 0, mirrorTiling: false }, ctx);
    expect(result.threadPaths).toHaveLength(6 + 6 * 3);
    for (const t of result.threadPaths) expect(t.pinIds).toHaveLength(2 * depth);
  });

  it("the outer triangle tips reach the same radius as the board's inscribed radius (R_tip == R0)", () => {
    const depth = 1;
    const result = buildGeneratorPattern({ patternId: "star-of-david", depth, layerAngle: 0.063, rotation: 0, mirrorTiling: false }, ctx);
    const allTriangleTips = result.pinPaths.slice(1).flatMap((p) => p.pins);
    const maxDistFromCentre = Math.max(...allTriangleTips.map((p) => Math.hypot(p.x - ctx.center.x, p.y - ctx.center.y)));
    expect(maxDistFromCentre).toBeCloseTo(ctx.maxRadius, 6);
  });

  it("every emitted pin id is a real id from its own tile's pin path", () => {
    const result = buildGeneratorPattern({ patternId: "star-of-david", depth: 3, layerAngle: 0.063, rotation: 0, mirrorTiling: false }, ctx);
    const allIds = new Set(result.pinPaths.flatMap((p) => p.pins.map((pin) => pin.id)));
    for (const t of result.threadPaths) for (const id of t.pinIds) expect(allIds.has(id)).toBe(true);
  });

  it("cycles the 24 (tile,side) runs' colour through the palette (docs/specs/32-generator-mode.md §Multicolor)", () => {
    const multiColourCtx: GeneratorBuildContext = { ...ctx, threadDefaults: { ...ctx.threadDefaults, colours: ["#111111", "#222222", "#333333"] } };
    const result = buildGeneratorPattern({ patternId: "star-of-david", depth: 2, layerAngle: 0.063, rotation: 0, mirrorTiling: false }, multiColourCtx);
    expect(result.threadPaths).toHaveLength(24);
    result.threadPaths.forEach((t, i) => expect(t.colours).toEqual([["#111111", "#222222", "#333333"][i % 3]]));
  });
});

describe("buildGeneratorPattern — spirals", () => {
  it("builds one freehand pin path with (nailsPerSpiral-1)*arms pins, threaded sequentially", () => {
    const result = buildGeneratorPattern({ patternId: "spirals", arms: 3, nailsPerSpiral: 41, totalAngleTurns: 0.52, rotation: 0 }, ctx);
    expect(result.pinPaths).toHaveLength(1);
    expect(result.pinPaths[0].geometry.type).toBe("freehand");
    expect(result.pinPaths[0].pins).toHaveLength(40 * 3);
    expect(result.threadPaths).toHaveLength(1);
    expect(result.threadPaths[0].pinIds).toEqual(result.pinPaths[0].pins.map((p) => p.id));
  });
});

describe("maxGeneratorColours", () => {
  it("mandala caps at its own layers count", () => {
    expect(maxGeneratorColours({ patternId: "mandala", n: 10, base: 2, layers: 7 } satisfies GeneratorParams)).toBe(7);
    expect(maxGeneratorColours({ patternId: "mandala", n: 10, base: 2, layers: 1 } satisfies GeneratorParams)).toBe(1);
  });

  it("star, freestyle, and spirals cap at 1 (each threads as one continuous run)", () => {
    expect(maxGeneratorColours({ patternId: "star", circleNails: 10, starPoints: 5, starOuterRatio: 1, starInnerRatio: 0.4, rotation: 0 } satisfies GeneratorParams)).toBe(1);
    expect(maxGeneratorColours({ patternId: "freestyle", circles: [] } satisfies GeneratorParams)).toBe(1);
    expect(maxGeneratorColours({ patternId: "spirals", arms: 5, nailsPerSpiral: 20, totalAngleTurns: 0.5, rotation: 0 } satisfies GeneratorParams)).toBe(1);
  });

  it("star-of-david caps at a fixed 24, independent of depth/mirrorTiling", () => {
    expect(maxGeneratorColours({ patternId: "star-of-david", depth: 1, layerAngle: 0.063, rotation: 0, mirrorTiling: false } satisfies GeneratorParams)).toBe(24);
    expect(maxGeneratorColours({ patternId: "star-of-david", depth: 40, layerAngle: 0.1, rotation: 1, mirrorTiling: true } satisfies GeneratorParams)).toBe(24);
  });
});

describe("GENERATOR_PATTERNS registry", () => {
  it("has exactly the 5 curated patterns, each with matching id/defaultParams.patternId", () => {
    const ids = Object.keys(GENERATOR_PATTERNS).sort();
    expect(ids).toEqual(["freestyle", "mandala", "spirals", "star", "star-of-david"]);
    for (const [id, def] of Object.entries(GENERATOR_PATTERNS)) {
      expect(def.id).toBe(id);
      expect(def.defaultParams.patternId).toBe(id);
    }
  });

  it("every pattern's own default params build successfully against a real context", () => {
    for (const def of Object.values(GENERATOR_PATTERNS)) {
      const result = buildGeneratorPattern(def.defaultParams, ctx);
      expect(result.pinPaths.length).toBeGreaterThan(0);
      expect(result.threadPaths.length).toBeGreaterThan(0);
    }
  });
});
