import { describe, expect, it } from "vitest";
import { cometLayerSequences } from "./comet";

describe("cometLayerSequences", () => {
  it("throws for non-positive n or layers", () => {
    expect(() => cometLayerSequences(0, 3, 20, 10)).toThrow();
    expect(() => cometLayerSequences(50, 0, 20, 10)).toThrow();
  });

  it("returns one sequence per layer", () => {
    expect(cometLayerSequences(50, 4, 20, 10)).toHaveLength(4);
  });

  it("every index stays within [0, n)", () => {
    const layers = cometLayerSequences(50, 5, 20, 10);
    for (const layer of layers) {
      for (const idx of layer.localIndices) {
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThan(50);
      }
    }
  });

  it("shrinks size and distance per layer, floored at 2 and 1 respectively", () => {
    const layers = cometLayerSequences(50, 30, 20, 10);
    // firstLayerSize/distance shrink toward the floors as `layer` grows large.
    const last = layers[layers.length - 1];
    expect(last.localIndices).toHaveLength(4); // size floor 2 -> 2*2 indices
  });
});
