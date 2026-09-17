import { describe, expect, it } from "vitest";
import { mandalaLayerSequences } from "./mandala";

describe("mandalaLayerSequences", () => {
  it("single layer: emits i -> (i*base mod n) for every i, no angular shift", () => {
    const [layer] = mandalaLayerSequences(8, 3, 1);
    expect(layer.localIndices).toEqual([0, 0, 1, 3, 2, 6, 3, 1, 4, 4, 5, 7, 6, 2, 7, 5]);
  });

  it("each layer has exactly 2n indices", () => {
    for (const layers of [1, 2, 3, 7]) {
      const result = mandalaLayerSequences(30, 7, layers);
      expect(result).toHaveLength(layers);
      for (const layer of result) expect(layer.localIndices).toHaveLength(60);
    }
  });

  it("layer 1+ applies a floor(n/layers) angular shift to every index", () => {
    const result = mandalaLayerSequences(12, 2, 3);
    // shiftStep = floor(12/3) = 4; layer 1 shift = 4, layer 2 shift = 8
    expect(result[1].localIndices[0]).toBe((0 + 4) % 12);
    expect(result[2].localIndices[0]).toBe((0 + 8) % 12);
  });

  it("every index stays within [0, n)", () => {
    const result = mandalaLayerSequences(17, 5, 4);
    for (const layer of result) {
      for (const idx of layer.localIndices) {
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThan(17);
      }
    }
  });

  it("rejects non-positive n or layers", () => {
    expect(() => mandalaLayerSequences(0, 2, 1)).toThrow();
    expect(() => mandalaLayerSequences(10, 2, 0)).toThrow();
  });
});
