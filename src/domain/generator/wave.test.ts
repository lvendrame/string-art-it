import { describe, expect, it } from "vitest";
import { waveLayerSequences } from "./wave";

describe("waveLayerSequences", () => {
  it("returns one sequence per layer", () => {
    expect(waveLayerSequences(100, 3, 4, 20, 10)).toHaveLength(4);
  });

  it("each layer has 2*layerFill indices, all within [0,n)", () => {
    const layers = waveLayerSequences(100, 3, 4, 20, 10);
    for (const layer of layers) {
      expect(layer.localIndices).toHaveLength(40);
      for (const idx of layer.localIndices) {
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThan(100);
      }
    }
  });

  it("shifts each layer's starting index by layerSpread", () => {
    const layers = waveLayerSequences(100, 3, 3, 5, 7);
    expect(layers[0].localIndices[0]).toBe(0);
    expect(layers[1].localIndices[0]).toBe(7);
    expect(layers[2].localIndices[0]).toBe(14);
  });

  it("clamps layerFill to n", () => {
    const layers = waveLayerSequences(10, 3, 1, 999, 0);
    expect(layers[0].localIndices).toHaveLength(20);
  });

  it("degenerates to Mandala's full-coverage shape when layerFill=n and layerSpread=0", () => {
    const layers = waveLayerSequences(50, 7, 1, 50, 0);
    expect(layers[0].localIndices).toHaveLength(100);
    expect(layers[0].localIndices[0]).toBe(0);
    expect(layers[0].localIndices[1]).toBe(0);
  });
});
