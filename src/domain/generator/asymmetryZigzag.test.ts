import { describe, expect, it } from "vitest";
import { asymmetryZigzag } from "./asymmetryZigzag";

describe("asymmetryZigzag", () => {
  it("throws for a non-positive circleCount or spokeCount", () => {
    expect(() => asymmetryZigzag(0, 5, 0, 1, false)).toThrow();
    expect(() => asymmetryZigzag(5, 0, 0, 1, false)).toThrow();
  });

  it("every node's index is within range for its own kind", () => {
    const nodes = asymmetryZigzag(20, 10, 0, 1, false);
    for (const node of nodes) {
      const bound = node.which === "circle" ? 20 : 10;
      expect(node.index).toBeGreaterThanOrEqual(0);
      expect(node.index).toBeLessThan(bound);
    }
  });

  it("crosses from the circle onto the spoke as the walk advances past circleCount", () => {
    const nodes = asymmetryZigzag(5, 5, 0, 1, false);
    const kinds = new Set(nodes.map((n) => n.which));
    expect(kinds.has("circle")).toBe(true);
    expect(kinds.has("spoke")).toBe(true);
  });

  it("reverse swaps which end advances which direction", () => {
    const forward = asymmetryZigzag(10, 10, 0, 0.5, false);
    const reversed = asymmetryZigzag(10, 10, 0, 0.5, true);
    expect(forward[0]).toEqual({ which: "circle", index: 0 });
    expect(reversed[0]).toEqual({ which: "spoke", index: 0 });
  });

  it("produces at least one step even when start and end fractions coincide", () => {
    const nodes = asymmetryZigzag(8, 8, 0.5, 0.5, false);
    expect(nodes.length).toBeGreaterThanOrEqual(2);
  });
});
