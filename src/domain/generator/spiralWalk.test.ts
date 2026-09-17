import { describe, expect, it } from "vitest";
import { spiralDecayingWalk } from "./spiralWalk";

describe("spiralDecayingWalk", () => {
  it("throws for non-positive n, repetition, or innerLength", () => {
    expect(() => spiralDecayingWalk(0, 1, 1)).toThrow();
    expect(() => spiralDecayingWalk(10, 0, 1)).toThrow();
    expect(() => spiralDecayingWalk(10, 1, 0)).toThrow();
  });

  it("starts at index 0", () => {
    expect(spiralDecayingWalk(50, 2, 10)[0]).toBe(0);
  });

  it("every index stays within [0, n)", () => {
    const walk = spiralDecayingWalk(50, 3, 20);
    for (const idx of walk) {
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(50);
    }
  });

  it("produces innerLength*(2*repetition) steps, matching the real step-count formula", () => {
    const n = 100;
    const repetition = 3;
    const innerLength = 20;
    const walk = spiralDecayingWalk(n, repetition, innerLength);
    expect(walk).toHaveLength(1 + innerLength * (2 * repetition - 1 + 1));
  });

  it("oscillates forward then backward (span, then -(span-1)) rather than walking monotonically", () => {
    const walk = spiralDecayingWalk(100, 1, 10);
    // repetition=1 -> realRepetition=1, so span decrements every 2 steps:
    // 0+10=10, 10-10+1=1(+1 nudge->2), 2+9=11, 11-9+1=3(+1 nudge->4), 4+8=12, ...
    expect(walk.slice(0, 6)).toEqual([0, 10, 2, 11, 4, 12]);
  });

  it("terminates for a large innerLength relative to n", () => {
    const walk = spiralDecayingWalk(20, 1, 50);
    expect(walk.length).toBeGreaterThan(1);
  });
});
