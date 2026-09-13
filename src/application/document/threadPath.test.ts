import { describe, expect, it } from "vitest";
import {
  remapPinsInThreadPath,
  remapPinsInThreadPathByMap,
  removePinFromThreadPath,
  splitThreadPathAtSegment,
  type ThreadPath,
} from "./threadPath";

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

describe("splitThreadPathAtSegment", () => {
  it("removing a middle segment splits into two fragments, keeping both endpoint pins", () => {
    const fragments = splitThreadPathAtSegment(makeThread(["A", "B", "C", "D", "E"]), 1); // segment B-C
    expect(fragments).toHaveLength(2);
    expect(fragments[0].pinIds).toEqual(["A", "B"]);
    expect(fragments[1].pinIds).toEqual(["C", "D", "E"]);
  });

  it("removing an end segment leaves a single surviving fragment", () => {
    const fragments = splitThreadPathAtSegment(makeThread(["A", "B", "C"]), 0); // segment A-B
    expect(fragments).toHaveLength(1);
    expect(fragments[0].pinIds).toEqual(["B", "C"]);
  });

  it("removing the only segment of a 2-pin path removes it entirely", () => {
    const fragments = splitThreadPathAtSegment(makeThread(["A", "B"]), 0);
    expect(fragments).toHaveLength(0);
  });

  it("fragments get fresh, distinct ids", () => {
    const fragments = splitThreadPathAtSegment(makeThread(["A", "B", "C", "D"]), 1); // segment B-C
    expect(fragments).toHaveLength(2);
    expect(fragments[0].id).not.toBe(fragments[1].id);
    expect(fragments[0].id).not.toBe("t1");
  });
});

describe("remapPinsInThreadPath", () => {
  it("replaces merged-away ids and collapses the adjacent duplicate they create", () => {
    // A-B-C-D-E, merging B and C into M -> A-M-M-D-E -> collapses to A-M-D-E.
    const [result, ...rest] = remapPinsInThreadPath(makeThread(["A", "B", "C", "D", "E"]), new Set(["B", "C"]), "M");
    expect(rest).toHaveLength(0);
    expect(result.pinIds).toEqual(["A", "M", "D", "E"]);
  });

  it("keeps the same path id — it's a contraction, not a fragment", () => {
    const [result] = remapPinsInThreadPath(makeThread(["A", "B", "C"]), new Set(["B"]), "M");
    expect(result.id).toBe("t1");
  });

  it("a thread reduced below 2 ids after collapsing is dropped entirely", () => {
    // A-B merging both A and B into the same new pin M collapses to just [M].
    const fragments = remapPinsInThreadPath(makeThread(["A", "B"]), new Set(["A", "B"]), "M");
    expect(fragments).toHaveLength(0);
  });

  it("no ids referenced by the merge leaves the thread unchanged in content", () => {
    const [result] = remapPinsInThreadPath(makeThread(["A", "B", "C"]), new Set(["Z"]), "M");
    expect(result.pinIds).toEqual(["A", "B", "C"]);
  });
});

// docs/specs/21-scale-and-pin-distance.md Nearest-Pin Reattachment — each old id maps
// to its OWN nearest new id, unlike Merge's single shared destination.
describe("remapPinsInThreadPathByMap", () => {
  it("remaps each id independently via the map", () => {
    const map = new Map([["A", "A2"], ["B", "B2"], ["C", "C2"]]);
    const [result] = remapPinsInThreadPathByMap(makeThread(["A", "B", "C"]), map);
    expect(result.pinIds).toEqual(["A2", "B2", "C2"]);
  });

  it("ids not present in the map are left unchanged (pins belonging to another Pin Path)", () => {
    const map = new Map([["B", "B2"]]);
    const [result] = remapPinsInThreadPathByMap(makeThread(["A", "B", "C"]), map);
    expect(result.pinIds).toEqual(["A", "B2", "C"]);
  });

  it("collapses adjacent duplicates created when two old ids map to the same new id", () => {
    const map = new Map([["B", "M"], ["C", "M"]]);
    const [result] = remapPinsInThreadPathByMap(makeThread(["A", "B", "C", "D"]), map);
    expect(result.pinIds).toEqual(["A", "M", "D"]);
  });

  it("a thread reduced below 2 distinct ids after collapsing is dropped entirely", () => {
    const map = new Map([["A", "M"], ["B", "M"]]);
    const fragments = remapPinsInThreadPathByMap(makeThread(["A", "B"]), map);
    expect(fragments).toHaveLength(0);
  });

  it("keeps the same path id — it's a contraction, not a fragment", () => {
    const map = new Map([["B", "B2"]]);
    const [result] = remapPinsInThreadPathByMap(makeThread(["A", "B", "C"]), map);
    expect(result.id).toBe("t1");
  });
});
