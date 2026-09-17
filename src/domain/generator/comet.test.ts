import { describe, expect, it } from "vitest";
import { clusterFraction, cometLayerSequences } from "./comet";

describe("clusterFraction", () => {
  it("is the identity when strength is 0", () => {
    for (const t of [0.1, 0.25, 0.5, 0.75, 0.9]) expect(clusterFraction(t, 0)).toBeCloseTo(t, 9);
  });

  it("is a no-op at the fixed points 0, 0.5, and 1", () => {
    expect(clusterFraction(0, 0.8)).toBeCloseTo(0, 9);
    expect(clusterFraction(0.5, 0.8)).toBeCloseTo(0.5, 9);
    expect(clusterFraction(1, 0.8)).toBeCloseTo(1, 9);
  });

  it("compresses values near the ends (clustering) as strength increases", () => {
    // t=0.1 should map CLOSER to 0 (more compressed) as strength rises.
    const low = clusterFraction(0.1, 0.2);
    const high = clusterFraction(0.1, 1);
    expect(high).toBeLessThan(low);
    expect(low).toBeLessThan(0.1);
  });

  it("stays within [0, 1] for any input in that range", () => {
    for (let i = 0; i <= 10; i += 1) {
      const t = i / 10;
      const v = clusterFraction(t, 0.7);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});

describe("cometLayerSequences", () => {
  it("throws for non-positive n or layers", () => {
    expect(() => cometLayerSequences(0, 3, 20, 10)).toThrow();
    expect(() => cometLayerSequences(50, 0, 20, 10)).toThrow();
  });

  it("returns one sequence per layer", () => {
    expect(cometLayerSequences(50, 4, 20, 5)).toHaveLength(4);
  });

  it("every index stays within [0, n)", () => {
    const layers = cometLayerSequences(50, 5, 20, 5);
    for (const layer of layers) {
      for (const idx of layer.localIndices) {
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThan(50);
      }
    }
  });

  it("run length is derived from the offset: n-d+1 steps, 2*(n-d+1) indices", () => {
    const n = 50;
    const firstLayerSize = 20;
    const layerDistance = 3;
    const layers = cometLayerSequences(n, 4, firstLayerSize, layerDistance);
    layers.forEach((layer, i) => {
      const d = Math.max(1, firstLayerSize - i * layerDistance);
      expect(layer.localIndices).toHaveLength(2 * (n - d + 1));
    });
  });

  it("offset floors at 1 once firstLayerSize-layer*layerDistance goes non-positive", () => {
    const layers = cometLayerSequences(50, 30, 20, 10);
    const last = layers[layers.length - 1];
    expect(last.localIndices).toHaveLength(2 * 50); // d=1 -> n-1+1=n steps
  });

  it("walks 0,d,1,d+1,2,d+2,... in order", () => {
    const layers = cometLayerSequences(20, 1, 5, 1);
    expect(layers[0].localIndices.slice(0, 6)).toEqual([0, 5, 1, 6, 2, 7]);
  });
});
