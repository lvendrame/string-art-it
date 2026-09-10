import { describe, expect, it } from "vitest";
import { removePinFromThreadPath, type ThreadPath } from "./threadPath";

function makeThread(pinIds: string[]): ThreadPath {
  return { id: "t1", colours: ["red"], width: 1, pinIds, twistPitch: 6 };
}

describe("removePinFromThreadPath", () => {
  it("removing an endpoint keeps the remaining pins as one path", () => {
    const [result, ...rest] = removePinFromThreadPath(makeThread(["A", "B", "C"]), "A");
    expect(rest).toHaveLength(0);
    expect(result.pinIds).toEqual(["B", "C"]);
  });

  it("removing a middle pin removes both adjacent segments (A-B-C example)", () => {
    const fragments = removePinFromThreadPath(makeThread(["A", "B", "C"]), "B");
    // Both fragments ([A] and [C]) have fewer than 2 pins -> the whole thread is gone.
    expect(fragments).toHaveLength(0);
  });

  it("removing an interior pin from a longer thread splits it into two surviving fragments", () => {
    const fragments = removePinFromThreadPath(makeThread(["A", "B", "C", "D", "E"]), "C");
    expect(fragments).toHaveLength(2);
    expect(fragments[0].pinIds).toEqual(["A", "B"]);
    expect(fragments[1].pinIds).toEqual(["D", "E"]);
  });

  it("a pin not referenced by the thread leaves it unchanged", () => {
    const original = makeThread(["A", "B", "C"]);
    const [result] = removePinFromThreadPath(original, "Z");
    expect(result).toBe(original);
  });

  it("reduced below 2 pins is removed entirely", () => {
    const fragments = removePinFromThreadPath(makeThread(["A", "B"]), "B");
    expect(fragments).toHaveLength(0);
  });
});
