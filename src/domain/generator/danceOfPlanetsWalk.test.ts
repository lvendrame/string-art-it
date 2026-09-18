import { describe, expect, it } from "vitest";
import { danceOfPlanetsWalk } from "./danceOfPlanetsWalk";

describe("danceOfPlanetsWalk", () => {
  it("throws for non-positive counts or rounds", () => {
    expect(() => danceOfPlanetsWalk(0, 5, 1, false)).toThrow();
    expect(() => danceOfPlanetsWalk(5, 0, 1, false)).toThrow();
    expect(() => danceOfPlanetsWalk(5, 5, 0, false)).toThrow();
  });

  it("starts at outer index 0", () => {
    expect(danceOfPlanetsWalk(10, 8, 1, false)[0]).toEqual({ which: "outer", index: 0 });
  });

  it("mostly traces adjacent-index pieces on the SAME ring, alternating rings each step", () => {
    const nodes = danceOfPlanetsWalk(10, 10, 1, false);
    // goto(0)[outer], step0(toInner=true): inner(0), inner(1); step1(toOuter): outer(1), outer(2); ...
    expect(nodes.slice(0, 7)).toEqual([
      { which: "outer", index: 0 },
      { which: "inner", index: 0 },
      { which: "inner", index: 1 },
      { which: "outer", index: 1 },
      { which: "outer", index: 2 },
      { which: "inner", index: 2 },
      { which: "inner", index: 3 },
    ]);
  });

  it("every index stays within range for its own ring", () => {
    const nodes = danceOfPlanetsWalk(7, 13, 3, false);
    for (const node of nodes) {
      const bound = node.which === "outer" ? 7 : 13;
      expect(node.index).toBeGreaterThanOrEqual(0);
      expect(node.index).toBeLessThan(bound);
    }
  });

  it("reverse walks the inner ring's index backward", () => {
    const forward = danceOfPlanetsWalk(10, 10, 1, false);
    const reversed = danceOfPlanetsWalk(10, 10, 1, true);
    // step=0's inner index is a fixed point (0 maps to itself either way); step=2's
    // inner call (nodes[5]) is where the two diverge.
    expect(reversed[5]).not.toEqual(forward[5]);
    expect(reversed[5].which).toBe("inner");
  });

  it("scales total steps by rounds (greaterCount*rounds)", () => {
    const oneRound = danceOfPlanetsWalk(10, 6, 1, false);
    const twoRounds = danceOfPlanetsWalk(10, 6, 2, false);
    expect(twoRounds.length).toBeGreaterThan(oneRound.length);
  });
});
