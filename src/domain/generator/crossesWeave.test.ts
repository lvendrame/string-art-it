import { describe, expect, it } from "vitest";
import { crossesWeave } from "./crossesWeave";

describe("crossesWeave", () => {
  it("yields exactly 3n nodes (3n-1 connecting segments), matching the source's own step count", () => {
    for (const n of [1, 2, 3, 5, 10]) {
      expect(crossesWeave(n, false)).toHaveLength(3 * n);
      expect(crossesWeave(n, true)).toHaveLength(3 * n);
    }
  });

  it("matches the source's hand-traced sequence for n=3, isReverse=false", () => {
    expect(crossesWeave(3, false)).toEqual([
      { which: "left", index: 0 },
      { which: "spine", index: 2 },
      { which: "right", index: 0 },
      { which: "right", index: 1 },
      { which: "spine", index: 1 },
      { which: "left", index: 1 },
      { which: "left", index: 2 },
      { which: "spine", index: 0 },
      { which: "right", index: 2 },
    ]);
  });

  it("isReverse counts the spine index up instead of down", () => {
    const nodes = crossesWeave(3, true);
    const spineIndices = nodes.filter((n) => n.which === "spine").map((n) => n.index);
    expect(spineIndices).toEqual([0, 1, 2]);
  });

  it("the spine index counts down when not reversed", () => {
    const nodes = crossesWeave(3, false);
    const spineIndices = nodes.filter((n) => n.which === "spine").map((n) => n.index);
    expect(spineIndices).toEqual([2, 1, 0]);
  });

  it("every left/right arm nail index stays within 0..n-1", () => {
    const nodes = crossesWeave(5, false);
    for (const node of nodes) {
      if (node.which !== "spine") expect(node.index).toBeGreaterThanOrEqual(0);
      expect(node.index).toBeLessThan(5);
    }
  });
});
