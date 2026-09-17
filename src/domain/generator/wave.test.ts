import { describe, expect, it } from "vitest";
import { waveLayerSequences } from "./wave";

describe("waveLayerSequences", () => {
  it("returns one sequence per layer", () => {
    expect(waveLayerSequences(100, 3, 4, 20, 10)).toHaveLength(4);
  });

  it("each layer has 4 indices per odd k in [1, layerFill), all within [0,n)", () => {
    const layers = waveLayerSequences(100, 3, 4, 21, 10);
    const oddCount = Math.ceil((21 - 1) / 2); // k = 1,3,5,...,19 -> 10 values
    for (const layer of layers) {
      expect(layer.localIndices).toHaveLength(oddCount * 4);
      for (const idx of layer.localIndices) {
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThan(100);
      }
    }
  });

  it("shifts each layer's cells by layerSpread*layer", () => {
    const layers = waveLayerSequences(100, 3, 3, 5, 7);
    // layer 0: shift=0, k=1 -> [1, 3, 6, 2]
    expect(layers[0].localIndices.slice(0, 4)).toEqual([1, 3, 6, 2]);
    // layer 1: shift=7, k=1 -> [8, 10, 13, 9]
    expect(layers[1].localIndices.slice(0, 4)).toEqual([8, 10, 13, 9]);
  });

  it("each cell is the 4-point [k, k*base mod n, +base, k+1] shape (shift=0)", () => {
    const layers = waveLayerSequences(50, 4, 1, 5, 0);
    // k=1: [1, 4, 8, 2]; k=3: [3, 12, 16, 4]
    expect(layers[0].localIndices).toEqual([1, 4, 8, 2, 3, 12, 16, 4]);
  });

  it("clamps layerFill to n", () => {
    const layers = waveLayerSequences(10, 3, 1, 999, 0);
    expect(layers[0].localIndices.length).toBeGreaterThan(0);
    for (const idx of layers[0].localIndices) {
      expect(idx).toBeLessThan(10);
    }
  });
});
