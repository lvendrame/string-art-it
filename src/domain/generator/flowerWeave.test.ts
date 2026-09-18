import { describe, expect, it } from "vitest";
import { flowerPetalWeave } from "./flowerWeave";

describe("flowerPetalWeave", () => {
  it("throws for nailsPerSide below 3", () => {
    expect(() => flowerPetalWeave(2)).toThrow();
  });

  it("starts with the 3 one-time corner anchors: prevSide(0), side(0), nextSide(0)", () => {
    const nodes = flowerPetalWeave(6);
    expect(nodes.slice(0, 3)).toEqual([
      { which: "prevSide", index: 0 },
      { which: "side", index: 0 },
      { which: "nextSide", index: 0 },
    ]);
  });

  it("has length 3 + 3*(nailsPerSide-2)", () => {
    for (const n of [3, 6, 10]) {
      expect(flowerPetalWeave(n)).toHaveLength(3 + 3 * (n - 2));
    }
  });

  it("only prevSide/side/centre appear after the initial 3 anchors (nextSide never revisited)", () => {
    const nodes = flowerPetalWeave(8);
    const rest = nodes.slice(3);
    for (const node of rest) expect(["prevSide", "side", "centre"]).toContain(node.which);
  });

  it("centre indices stay within [1, nailsPerSide-2]", () => {
    const n = 8;
    const nodes = flowerPetalWeave(n);
    const centreIndices = nodes.filter((node) => node.which === "centre").map((node) => node.index);
    for (const idx of centreIndices) {
      expect(idx).toBeGreaterThanOrEqual(1);
      expect(idx).toBeLessThanOrEqual(n - 2);
    }
  });

  it("boundary indices stay within [0, nailsPerSide-1]", () => {
    const n = 8;
    const nodes = flowerPetalWeave(n);
    for (const node of nodes) {
      if (node.which === "centre") continue;
      expect(node.index).toBeGreaterThanOrEqual(0);
      expect(node.index).toBeLessThan(n);
    }
  });
});
