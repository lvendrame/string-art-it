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

  it("reverse produces a different walk than forward for the same start/end", () => {
    const forward = asymmetryZigzag(10, 10, 0.3, 1, false);
    const reversed = asymmetryZigzag(10, 10, 0.3, 1, true);
    expect(reversed).not.toEqual(forward);
  });

  it("each successive chord's far end creeps forward by a fixed offset (fixed `start`, advancing index)", () => {
    // circleCount=20, spokeCount=10, start=round(0.1*30)=3
    const nodes = asymmetryZigzag(20, 10, 0.1, 1, false);
    // index=0: prevPointIndex = 0+start = 3 -> {circle,3}
    expect(nodes[1]).toEqual({ which: "circle", index: 3 });
    // index=1 (isPrevSide now true): connector = toNode(3+1)=4, then prevPointIndex=index=1
    expect(nodes[2]).toEqual({ which: "circle", index: 4 });
    expect(nodes[3]).toEqual({ which: "circle", index: 1 });
  });

  it("produces at least one step even when start and end fractions coincide", () => {
    const nodes = asymmetryZigzag(8, 8, 0.5, 0.5, false);
    expect(nodes.length).toBeGreaterThanOrEqual(2);
  });
});
