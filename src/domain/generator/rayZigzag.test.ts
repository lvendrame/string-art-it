import { describe, expect, it } from "vitest";
import { sameIndexZigzag, twoRayZigzag } from "./rayZigzag";

describe("twoRayZigzag", () => {
  it("throws for a non-positive count", () => {
    expect(() => twoRayZigzag(0, 5)).toThrow();
    expect(() => twoRayZigzag(5, 0)).toThrow();
  });

  it("produces 2n-1 nodes for equal counts n", () => {
    expect(twoRayZigzag(6, 6)).toHaveLength(11);
    expect(twoRayZigzag(1, 1)).toHaveLength(1);
  });

  it("starts on B's last index", () => {
    const nodes = twoRayZigzag(6, 6);
    expect(nodes[0]).toEqual({ which: "B", index: 5 });
  });

  it("alternates A forward / B backward after the pivot", () => {
    const nodes = twoRayZigzag(4, 4);
    // [B3, A0, B2, A1, B1, A2, B0]
    expect(nodes).toEqual([
      { which: "B", index: 3 },
      { which: "A", index: 0 },
      { which: "B", index: 2 },
      { which: "A", index: 1 },
      { which: "B", index: 1 },
      { which: "A", index: 2 },
      { which: "B", index: 0 },
    ]);
  });

  it("every emitted index is within range for its own sequence", () => {
    const nodes = twoRayZigzag(5, 8);
    for (const node of nodes) {
      const bound = node.which === "A" ? 5 : 8;
      expect(node.index).toBeGreaterThanOrEqual(0);
      expect(node.index).toBeLessThan(bound);
    }
  });

  it("bounds the walk by the shorter sequence when counts differ", () => {
    const nodes = twoRayZigzag(3, 8);
    expect(nodes).toHaveLength(1 + 2 * (3 - 1));
  });
});

describe("sameIndexZigzag", () => {
  it("throws for a non-positive count", () => {
    expect(() => sameIndexZigzag(0, 5)).toThrow();
    expect(() => sameIndexZigzag(5, 0)).toThrow();
  });

  it("produces the 4-point cell [A_k, B_k, B_k+1, A_k+1] for advancing even k", () => {
    const nodes = sameIndexZigzag(6, 6);
    expect(nodes).toEqual([
      { which: "A", index: 0 },
      { which: "B", index: 0 },
      { which: "B", index: 1 },
      { which: "A", index: 1 },
      { which: "A", index: 2 },
      { which: "B", index: 2 },
      { which: "B", index: 3 },
      { which: "A", index: 3 },
      { which: "A", index: 4 },
      { which: "B", index: 4 },
      { which: "B", index: 5 },
      { which: "A", index: 5 },
    ]);
  });

  it("every emitted index is within range for its own sequence", () => {
    const nodes = sameIndexZigzag(5, 8);
    for (const node of nodes) {
      const bound = node.which === "A" ? 5 : 8;
      expect(node.index).toBeGreaterThanOrEqual(0);
      expect(node.index).toBeLessThan(bound);
    }
  });

  it("bounds the walk by the shorter sequence when counts differ", () => {
    const nodes = sameIndexZigzag(4, 9);
    for (const node of nodes) expect(node.index).toBeLessThan(4);
  });
});
