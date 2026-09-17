import { describe, expect, it } from "vitest";
import { spiralDecayingWalk } from "./spiralWalk";

describe("spiralDecayingWalk", () => {
  it("throws for non-positive n, repetition, or innerLength", () => {
    expect(() => spiralDecayingWalk(0, 1, 1)).toThrow();
    expect(() => spiralDecayingWalk(10, 0, 1)).toThrow();
    expect(() => spiralDecayingWalk(10, 1, 0)).toThrow();
  });

  it("starts at index 0", () => {
    expect(spiralDecayingWalk(50, 2, 3)[0]).toBe(0);
  });

  it("every index stays within [0, n)", () => {
    const walk = spiralDecayingWalk(50, 3, 3);
    for (const idx of walk) {
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(50);
    }
  });

  it("each repetition contributes startSpan - innerLength steps", () => {
    const n = 50;
    const innerLength = 3;
    const repetition = 2;
    const startSpan = Math.max(innerLength + 1, Math.floor(n / 2));
    const walk = spiralDecayingWalk(n, repetition, innerLength);
    expect(walk).toHaveLength(1 + repetition * (startSpan - innerLength));
  });

  it("terminates even when innerLength is close to n/2", () => {
    const walk = spiralDecayingWalk(10, 1, 4);
    expect(walk.length).toBeGreaterThan(1);
  });
});
