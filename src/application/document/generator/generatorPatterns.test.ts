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
  it("produces 1 circle pin path + starPoints spoke (line) pin paths, each with sideNails pins", () => {
    const sideNails = 12;
    const result = buildGeneratorPattern({ patternId: "star", sideNails, starPoints: 5, starOuterRatio: 1, starInnerRatio: 0, rotation: 0 }, ctx);
    expect(result.pinPaths).toHaveLength(1 + 5);
    expect(result.pinPaths[0].geometry.type).toBe("circle");
    expect(result.pinPaths[0].pins).toHaveLength(5 * (sideNails - 1));
    for (const spoke of result.pinPaths.slice(1)) {
      expect(spoke.geometry.type).toBe("line");
      expect(spoke.pins).toHaveLength(sideNails);
    }
  });

  it("threads 3 zigzags per point (2 spoke↔circle + 1 adjacent-spoke), each 2*(sideNails-1)+1 pin ids", () => {
    const sideNails = 8;
    const starPoints = 5;
    const result = buildGeneratorPattern({ patternId: "star", sideNails, starPoints, starOuterRatio: 1, starInnerRatio: 0, rotation: 0 }, ctx);
    expect(result.threadPaths).toHaveLength(starPoints * 3);
    for (const t of result.threadPaths) expect(t.pinIds).toHaveLength(2 * (sideNails - 1) + 1);
  });

  it("the 2 spoke↔circle zigzags per point only ever touch that spoke and circle pins (never another spoke)", () => {
    const sideNails = 6;
    const starPoints = 4;
    const result = buildGeneratorPattern({ patternId: "star", sideNails, starPoints, starOuterRatio: 1, starInnerRatio: 0, rotation: 0 }, ctx);
    const circleIds = new Set(result.pinPaths[0].pins.map((p) => p.id));
    for (let s = 0; s < starPoints; s += 1) {
      const spokeIds = new Set(result.pinPaths[s + 1].pins.map((p) => p.id));
      for (const t of result.threadPaths.slice(s * 2, s * 2 + 2)) {
        for (const id of t.pinIds) expect(spokeIds.has(id) || circleIds.has(id)).toBe(true);
      }
    }
  });

  it("the adjacent-spoke zigzag (last starPoints threads) only ever touches its own 2 neighbouring spokes", () => {
    const sideNails = 6;
    const starPoints = 4;
    const result = buildGeneratorPattern({ patternId: "star", sideNails, starPoints, starOuterRatio: 1, starInnerRatio: 0, rotation: 0 }, ctx);
    const adjacentThreads = result.threadPaths.slice(starPoints * 2);
    expect(adjacentThreads).toHaveLength(starPoints);
    adjacentThreads.forEach((t, s) => {
      const s2 = (s + 1) % starPoints;
      const allowed = new Set([...result.pinPaths[s + 1].pins.map((p) => p.id), ...result.pinPaths[s2 + 1].pins.map((p) => p.id)]);
      for (const id of t.pinIds) expect(allowed.has(id)).toBe(true);
    });
  });

  it("every emitted pin id is a real id from one of the pin paths", () => {
    const result = buildGeneratorPattern({ patternId: "star", sideNails: 10, starPoints: 5, starOuterRatio: 1, starInnerRatio: 0, rotation: 0 }, ctx);
    const allIds = new Set(result.pinPaths.flatMap((p) => p.pins.map((pin) => pin.id)));
    for (const t of result.threadPaths) for (const id of t.pinIds) expect(allIds.has(id)).toBe(true);
  });

  it("each spoke spans from starInnerRatio*R0 to starOuterRatio*R0 from the board centre", () => {
    const result = buildGeneratorPattern({ patternId: "star", sideNails: 10, starPoints: 5, starOuterRatio: 0.9, starInnerRatio: 0.2, rotation: 0 }, ctx);
    for (const spoke of result.pinPaths.slice(1)) {
      const dists = spoke.pins.map((p) => Math.hypot(p.x - ctx.center.x, p.y - ctx.center.y));
      expect(Math.max(...dists)).toBeCloseTo(ctx.maxRadius * 0.9, 6);
      expect(Math.min(...dists)).toBeCloseTo(ctx.maxRadius * 0.2, 6);
    }
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

function allPinIdsValid(result: { pinPaths: { pins: { id: string }[] }[]; threadPaths: { pinIds: string[] }[] }): boolean {
  const validIds = new Set(result.pinPaths.flatMap((p) => p.pins.map((pin) => pin.id)));
  return result.threadPaths.every((t) => t.pinIds.every((id) => validIds.has(id)));
}

describe("buildGeneratorPattern — wave", () => {
  it("produces exactly n pins on one circle and layers thread paths of 2*layerFill indices each", () => {
    const result = buildGeneratorPattern({ patternId: "wave", n: 100, base: 3, layers: 4, layerFill: 20, layerSpread: 10 }, ctx);
    expect(result.pinPaths).toHaveLength(1);
    expect(result.pinPaths[0].pins).toHaveLength(100);
    expect(result.threadPaths).toHaveLength(4);
    for (const t of result.threadPaths) expect(t.pinIds).toHaveLength(40);
    expect(allPinIdsValid(result)).toBe(true);
  });
});

describe("buildGeneratorPattern — hexagon-spades", () => {
  it("builds 6 triangle tiles (no hub), 18 Thread Paths total (6 tiles * 3 sides)", () => {
    const result = buildGeneratorPattern({ patternId: "hexagon-spades", depth: 5, layerAngle: 0.05, rotation: 0, mirrorTiling: false }, ctx);
    expect(result.pinPaths).toHaveLength(6);
    expect(result.threadPaths).toHaveLength(18);
    expect(allPinIdsValid(result)).toBe(true);
  });
});

describe("buildGeneratorPattern — dance-of-planets", () => {
  it("builds 2 concentric pin paths and round-robins them into one thread, repeated `rounds` times", () => {
    const result = buildGeneratorPattern(
      { patternId: "dance-of-planets", outerType: "circle", outerNails: 40, outerSides: 6, innerType: "circle", innerNails: 20, innerSides: 6, innerSizeRatio: 0.4, rounds: 2, reverse: false, rotation: 0 },
      ctx,
    );
    expect(result.pinPaths).toHaveLength(2);
    expect(result.threadPaths).toHaveLength(1);
    expect(result.threadPaths[0].pinIds).toHaveLength(2 * (Math.max(40, 20) * 2));
    expect(allPinIdsValid(result)).toBe(true);
  });

  it("supports a regular-polygon outer/inner ring", () => {
    const result = buildGeneratorPattern(
      { patternId: "dance-of-planets", outerType: "polygon", outerNails: 30, outerSides: 5, innerType: "polygon", innerNails: 18, innerSides: 3, innerSizeRatio: 0.3, rounds: 1, reverse: true, rotation: 0 },
      ctx,
    );
    expect(result.pinPaths[0].geometry.type).toBe("regular-polygon");
    expect(result.pinPaths[1].geometry.type).toBe("regular-polygon");
    expect(allPinIdsValid(result)).toBe(true);
  });
});

describe("buildGeneratorPattern — sun", () => {
  it("builds the base star's pin/thread paths plus `layers` extra shrinking rings", () => {
    const starOnly = buildGeneratorPattern({ patternId: "star", sideNails: 10, starPoints: 5, starOuterRatio: 1, starInnerRatio: 0, rotation: 0 }, ctx);
    const result = buildGeneratorPattern({ patternId: "sun", sideNails: 10, starPoints: 5, starOuterRatio: 1, starInnerRatio: 0, rotation: 0, layers: 3, layerSpread: 0.1 }, ctx);
    expect(result.pinPaths).toHaveLength(starOnly.pinPaths.length + 3);
    expect(result.threadPaths).toHaveLength(starOnly.threadPaths.length + 3);
    expect(allPinIdsValid(result)).toBe(true);
  });
});

describe("buildGeneratorPattern — vortex", () => {
  it("builds one regular-polygon pin path per level, sides*nailsPerSide pins each", () => {
    const result = buildGeneratorPattern({ patternId: "vortex", sides: 5, nailsPerSide: 8, layers: 6, layerAngle: 0.05, rotation: 0 }, ctx);
    expect(result.pinPaths).toHaveLength(6);
    for (const p of result.pinPaths) {
      expect(p.geometry.type).toBe("regular-polygon");
      expect(p.pins).toHaveLength(5 * 8);
    }
    expect(allPinIdsValid(result)).toBe(true);
  });

  it("threads nailsPerSide closed loops per level, each visiting one same-side-index chord per side", () => {
    const result = buildGeneratorPattern({ patternId: "vortex", sides: 5, nailsPerSide: 8, layers: 3, layerAngle: 0.05, rotation: 0 }, ctx);
    expect(result.threadPaths).toHaveLength(3 * 8); // layers * nailsPerSide
    for (const t of result.threadPaths) expect(t.pinIds).toHaveLength(5 + 1); // sides + 1 (closed loop)
  });
});

describe("buildGeneratorPattern — polygon", () => {
  it("builds sides*nailsPerSide pins on one regular-polygon and one thread per side", () => {
    const result = buildGeneratorPattern({ patternId: "polygon", sides: 6, nailsPerSide: 10, bezierStep: 2, rotation: 0 }, ctx);
    expect(result.pinPaths).toHaveLength(1);
    expect(result.pinPaths[0].pins).toHaveLength(60);
    expect(result.threadPaths).toHaveLength(6);
    expect(allPinIdsValid(result)).toBe(true);
  });
});

describe("buildGeneratorPattern — flower", () => {
  it("builds `layers` rotated polygon copies, each with its own `sides` threads", () => {
    const result = buildGeneratorPattern({ patternId: "flower", sides: 5, nailsPerSide: 8, layers: 3, rotation: 0 }, ctx);
    expect(result.pinPaths).toHaveLength(3);
    expect(result.threadPaths).toHaveLength(3 * 5);
    expect(allPinIdsValid(result)).toBe(true);
  });
});

describe("buildGeneratorPattern — assymetry", () => {
  it("builds 1 circle + 1 spoke line, woven into a single continuous thread", () => {
    const result = buildGeneratorPattern({ patternId: "assymetry", circleNails: 30, startFraction: 0, endFraction: 1, reverse: false, rotation: 0 }, ctx);
    expect(result.pinPaths).toHaveLength(2);
    expect(result.threadPaths).toHaveLength(1);
    expect(allPinIdsValid(result)).toBe(true);
  });
});

describe("buildGeneratorPattern — spiral", () => {
  it("builds one circle threaded as a single continuous decaying-span walk", () => {
    const result = buildGeneratorPattern({ patternId: "spiral", n: 60, repetition: 2, innerLength: 3, rotation: 0 }, ctx);
    expect(result.pinPaths).toHaveLength(1);
    expect(result.pinPaths[0].pins).toHaveLength(60);
    expect(result.threadPaths).toHaveLength(1);
    expect(allPinIdsValid(result)).toBe(true);
  });
});

describe("buildGeneratorPattern — maurer-rose", () => {
  it("builds one freehand pin path with maxSteps+1 curve-sampled pins, threaded sequentially", () => {
    const result = buildGeneratorPattern({ patternId: "maurer-rose", N: 7, maxSteps: 90, angleDegrees: 71, rotation: 0 }, ctx);
    expect(result.pinPaths).toHaveLength(1);
    expect(result.pinPaths[0].geometry.type).toBe("freehand");
    expect(result.pinPaths[0].pins).toHaveLength(91);
    expect(result.threadPaths).toHaveLength(1);
    expect(result.threadPaths[0].pinIds).toEqual(result.pinPaths[0].pins.map((p) => p.id));
  });
});

describe("buildGeneratorPattern — comet", () => {
  it("builds one freehand pin path with `layers` shrinking offset-alternation threads", () => {
    const result = buildGeneratorPattern({ patternId: "comet", n: 80, layers: 5, firstLayerSize: 20, layerDistance: 3, clusterStrength: 0.7, distortion: 0.38, rotation: 0 }, ctx);
    expect(result.pinPaths).toHaveLength(1);
    expect(result.pinPaths[0].geometry.type).toBe("freehand");
    expect(result.pinPaths[0].pins).toHaveLength(80);
    expect(result.threadPaths).toHaveLength(5);
    expect(allPinIdsValid(result)).toBe(true);
  });

  it("clusters nail angles near the tail direction rather than spacing them uniformly", () => {
    const result = buildGeneratorPattern({ patternId: "comet", n: 40, layers: 1, firstLayerSize: 10, layerDistance: 1, clusterStrength: 0.8, distortion: 0, rotation: 0 }, ctx);
    const pins = result.pinPaths[0].pins;
    const angle = (p: { x: number; y: number }) => Math.atan2(p.y - ctx.center.y, p.x - ctx.center.x);
    const gaps = pins.map((p, i) => {
      const next = pins[(i + 1) % pins.length];
      let d = angle(next) - angle(p);
      while (d < 0) d += 2 * Math.PI;
      while (d > Math.PI) d -= 2 * Math.PI;
      return Math.abs(d);
    });
    expect(Math.max(...gaps)).toBeGreaterThan(Math.min(...gaps) * 3); // non-uniform
  });

  it("distortion squashes the y-radius, producing an ellipse (x extent > y extent)", () => {
    const result = buildGeneratorPattern({ patternId: "comet", n: 40, layers: 1, firstLayerSize: 10, layerDistance: 1, clusterStrength: 0, distortion: 0.5, rotation: 0 }, ctx);
    const pins = result.pinPaths[0].pins;
    const xExtent = Math.max(...pins.map((p) => p.x)) - Math.min(...pins.map((p) => p.x));
    const yExtent = Math.max(...pins.map((p) => p.y)) - Math.min(...pins.map((p) => p.y));
    expect(xExtent).toBeCloseTo(2 * ctx.maxRadius, 5);
    expect(yExtent).toBeCloseTo(2 * ctx.maxRadius * 0.5, 5);
  });
});

describe("buildGeneratorPattern — flower-of-life", () => {
  it("builds the 6-tile ring plus an optional outer ring circle when ringEnabled", () => {
    const withoutRing = buildGeneratorPattern({ patternId: "flower-of-life", depth: 5, layerAngle: 0.05, rotation: 0, ringEnabled: false, ringNails: 100, ringBase: 2 }, ctx);
    expect(withoutRing.pinPaths).toHaveLength(6);
    expect(withoutRing.threadPaths).toHaveLength(18);

    const withRing = buildGeneratorPattern({ patternId: "flower-of-life", depth: 5, layerAngle: 0.05, rotation: 0, ringEnabled: true, ringNails: 100, ringBase: 2 }, ctx);
    expect(withRing.pinPaths).toHaveLength(7);
    expect(withRing.threadPaths).toHaveLength(19);
    expect(allPinIdsValid(withRing)).toBe(true);
  });
});

describe("buildGeneratorPattern — lotus", () => {
  it("builds `sides` circles and one round-robin thread per adjacent pair", () => {
    const result = buildGeneratorPattern({ patternId: "lotus", sides: 6, nailsPerCircle: 20, radiusRatio: 0.5, rotation: 0 }, ctx);
    expect(result.pinPaths).toHaveLength(6);
    expect(result.threadPaths).toHaveLength(6);
    expect(allPinIdsValid(result)).toBe(true);
  });
});

describe("buildGeneratorPattern — crosses", () => {
  it("builds 4 lines ('#' grid) and one thread per of the 4 crossing pairs", () => {
    const result = buildGeneratorPattern({ patternId: "crosses", nailsPerLine: 15, gap: 0.15, rotation: 0 }, ctx);
    expect(result.pinPaths).toHaveLength(4);
    expect(result.threadPaths).toHaveLength(4);
    expect(allPinIdsValid(result)).toBe(true);
  });
});

describe("maxGeneratorColours", () => {
  it("mandala caps at its own layers count", () => {
    expect(maxGeneratorColours({ patternId: "mandala", n: 10, base: 2, layers: 7 } satisfies GeneratorParams)).toBe(7);
    expect(maxGeneratorColours({ patternId: "mandala", n: 10, base: 2, layers: 1 } satisfies GeneratorParams)).toBe(1);
  });

  it("star caps at 3*starPoints (2 spoke↔circle zigzags + 1 adjacent-spoke zigzag per point)", () => {
    expect(maxGeneratorColours({ patternId: "star", sideNails: 10, starPoints: 5, starOuterRatio: 1, starInnerRatio: 0, rotation: 0 } satisfies GeneratorParams)).toBe(15);
    expect(maxGeneratorColours({ patternId: "star", sideNails: 10, starPoints: 8, starOuterRatio: 1, starInnerRatio: 0, rotation: 0 } satisfies GeneratorParams)).toBe(24);
  });

  it("freestyle and spirals cap at 1 (each threads as one continuous run)", () => {
    expect(maxGeneratorColours({ patternId: "freestyle", circles: [] } satisfies GeneratorParams)).toBe(1);
    expect(maxGeneratorColours({ patternId: "spirals", arms: 5, nailsPerSpiral: 20, totalAngleTurns: 0.5, rotation: 0 } satisfies GeneratorParams)).toBe(1);
  });

  it("star-of-david caps at a fixed 24, independent of depth/mirrorTiling", () => {
    expect(maxGeneratorColours({ patternId: "star-of-david", depth: 1, layerAngle: 0.063, rotation: 0, mirrorTiling: false } satisfies GeneratorParams)).toBe(24);
    expect(maxGeneratorColours({ patternId: "star-of-david", depth: 40, layerAngle: 0.1, rotation: 1, mirrorTiling: true } satisfies GeneratorParams)).toBe(24);
  });
});

describe("GENERATOR_PATTERNS registry", () => {
  it("has exactly the 19 researched patterns, each with matching id/defaultParams.patternId", () => {
    const ids = Object.keys(GENERATOR_PATTERNS).sort();
    expect(ids).toEqual(
      [
        "assymetry",
        "comet",
        "crosses",
        "dance-of-planets",
        "flower",
        "flower-of-life",
        "freestyle",
        "hexagon-spades",
        "lotus",
        "mandala",
        "maurer-rose",
        "polygon",
        "spiral",
        "spirals",
        "star",
        "star-of-david",
        "sun",
        "vortex",
        "wave",
      ].sort(),
    );
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
