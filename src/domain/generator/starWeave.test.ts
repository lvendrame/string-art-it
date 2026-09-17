import { describe, expect, it } from "vitest";
import { starAdjacentSpokeZigzag, starSpokeCircleZigzag } from "./starWeave";

describe("starSpokeCircleZigzag", () => {
  it("has length 2*(sideNails-1)+1, alternating circle/spoke/circle/...", () => {
    const nodes = starSpokeCircleZigzag(8, 24, 3, 1);
    expect(nodes).toHaveLength(2 * 23 + 1);
    nodes.forEach((n, i) => expect(n.kind).toBe(i % 2 === 0 ? "circle" : "spoke"));
  });

  it("direction +1 walks outward from the spoke's own pivot into ascending circle indices", () => {
    const nodes = starSpokeCircleZigzag(8, 24, 0, 1);
    expect(nodes[0]).toEqual({ kind: "circle", index: 0 });
    expect(nodes[1]).toEqual({ kind: "spoke", spoke: 0, index: 0 });
    expect(nodes[2]).toEqual({ kind: "circle", index: 1 });
    expect(nodes.at(-1)).toEqual({ kind: "circle", index: 23 });
  });

  it("direction -1 walks the other way, wrapping around the full circle", () => {
    const nodes = starSpokeCircleZigzag(8, 24, 0, -1);
    expect(nodes[0]).toEqual({ kind: "circle", index: 1 });
    expect(nodes.at(-1)).toEqual({ kind: "circle", index: 184 - 22 }); // wraps
  });

  it("every spoke index 0..sideNails-2 appears exactly once", () => {
    const nodes = starSpokeCircleZigzag(5, 10, 2, 1);
    const spokeIndices = nodes.filter((n) => n.kind === "spoke").map((n) => (n as { index: number }).index);
    expect(spokeIndices.sort((a, b) => a - b)).toEqual(Array.from({ length: 9 }, (_, i) => i));
  });
});

describe("starAdjacentSpokeZigzag", () => {
  it("has length 2*(sideNails-1)+1, alternating spoke/spoke/spoke/...", () => {
    const nodes = starAdjacentSpokeZigzag(24, 2, 3);
    expect(nodes).toHaveLength(2 * 23 + 1);
    for (const n of nodes) expect(n.kind).toBe("spoke");
  });

  it("starts at spokeB's rim, alternates spokeA ascending / spokeB descending", () => {
    const nodes = starAdjacentSpokeZigzag(24, 2, 3);
    expect(nodes[0]).toEqual({ kind: "spoke", spoke: 3, index: 23 });
    expect(nodes[1]).toEqual({ kind: "spoke", spoke: 2, index: 0 });
    expect(nodes[2]).toEqual({ kind: "spoke", spoke: 3, index: 22 });
    expect(nodes.at(-1)).toEqual({ kind: "spoke", spoke: 3, index: 0 });
  });
});
