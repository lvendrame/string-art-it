import { describe, expect, it } from "vitest";
import { roundRobinSequence } from "./roundRobin";

describe("roundRobinSequence", () => {
  it("visits local index r%count of each enabled group in group order, per round", () => {
    expect(roundRobinSequence([3, 2])).toEqual([
      { groupIndex: 0, localIndex: 0 },
      { groupIndex: 1, localIndex: 0 },
      { groupIndex: 0, localIndex: 1 },
      { groupIndex: 1, localIndex: 1 },
      { groupIndex: 0, localIndex: 2 },
      { groupIndex: 1, localIndex: 0 },
    ]);
  });

  it("skips disabled (0-count) groups but keeps their groupIndex for the others", () => {
    expect(roundRobinSequence([2, 0, 2])).toEqual([
      { groupIndex: 0, localIndex: 0 },
      { groupIndex: 2, localIndex: 0 },
      { groupIndex: 0, localIndex: 1 },
      { groupIndex: 2, localIndex: 1 },
    ]);
  });

  it("returns an empty sequence when every group is disabled", () => {
    expect(roundRobinSequence([0, 0])).toEqual([]);
    expect(roundRobinSequence([])).toEqual([]);
  });

  it("rounds run to the largest enabled group's count (wrapping the smaller ones)", () => {
    const seq = roundRobinSequence([1, 3]);
    expect(seq).toHaveLength(6);
    expect(seq.filter((s) => s.groupIndex === 0).map((s) => s.localIndex)).toEqual([0, 0, 0]);
    expect(seq.filter((s) => s.groupIndex === 1).map((s) => s.localIndex)).toEqual([0, 1, 2]);
  });
});
