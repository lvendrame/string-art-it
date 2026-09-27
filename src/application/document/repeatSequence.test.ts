import { describe, expect, it } from "vitest";
import { buildRepeatThreadPins, computeRepeatGroups, fullFillCycleCount } from "./repeatSequence";
import type { PinLayer } from "./pinLayer";
import type { PinPath } from "./pinPath";
import type { SymmetryConfig } from "./symmetryConfig";

function circlePath(id: string, pinIds: string[], symmetry: SymmetryConfig = { type: "none" }): PinPath {
  return {
    id,
    geometry: { type: "circle", center: { x: 0, y: 0 }, radius: pinIds.length },
    requestedSpacing: 1,
    actualSpacing: 1,
    pins: pinIds.map((pid, i) => ({ id: pid, x: i, y: 0 })),
    guideVisible: true,
    colour: "#fff",
    diameter: 2,
    symmetry,
  };
}

function layerOf(...pinPaths: PinPath[]): PinLayer[] {
  return [{ id: "layer-1", name: "Layer 1", visible: true, locked: false, pinPaths }];
}

function ids(from: number, to: number): string[] {
  return Array.from({ length: to - from + 1 }, (_, i) => String(from + i));
}

const ring40 = layerOf(circlePath("a", ids(1, 40)));
const clicks = [...ids(1, 5), ...ids(11, 15)];

describe("computeRepeatGroups", () => {
  it("extends each pair by its own step for every cycle", () => {
    expect(computeRepeatGroups(ring40, clicks, 2, false)).toEqual([ids(1, 5), ids(11, 15), ids(21, 25), ids(31, 35)]);
  });

  it("returns only the clicked halves for zero cycles", () => {
    expect(computeRepeatGroups(ring40, clicks, 0, false)).toEqual([ids(1, 5), ids(11, 15)]);
  });

  it("ignores the last pin of an odd selection", () => {
    expect(computeRepeatGroups(ring40, ["1", "2", "11", "12", "30"], 1, false)).toEqual([["1", "2"], ["11", "12"], ["21", "22"]]);
  });

  it("needs at least 4 usable pins", () => {
    expect(computeRepeatGroups(ring40, ["1", "2", "11"], 1, false)).toBeUndefined();
  });

  it("returns undefined for unknown pins", () => {
    expect(computeRepeatGroups(ring40, ["1", "x", "11", "12"], 1, false)).toBeUndefined();
  });

  it("wraps around the ring", () => {
    expect(computeRepeatGroups(ring40, ["30", "31", "35", "36"], 2, false)).toEqual([["30", "31"], ["35", "36"], ["40", "1"], ["5", "6"]]);
  });

  it("walks negative steps", () => {
    expect(computeRepeatGroups(ring40, ["11", "12", "1", "2"], 1, false)).toEqual([["11", "12"], ["1", "2"], ["31", "32"]]);
  });

  it("walks the second pin's own path when a pair spans two paths", () => {
    const layers = layerOf(circlePath("a", ids(1, 10)), circlePath("b", ids(101, 120)));
    // first[i] index 0/1, second[i] index 4/5 on path b → step 4
    expect(computeRepeatGroups(layers, ["1", "2", "105", "106"], 1, false)).toEqual([["1", "2"], ["105", "106"], ["109", "110"]]);
  });

  it("stays within a mirrored copy", () => {
    const layers = layerOf(circlePath("a", ids(1, 40), { type: "horizontal", axis: { x: 0, y: 0 } }));
    expect(computeRepeatGroups(layers, ["1~mirror-0", "2~mirror-0", "11~mirror-0", "12~mirror-0"], 1, false)?.[2]).toEqual(["21~mirror-0", "22~mirror-0"]);
  });

  it("full-fill ignores cycles and stops before landing exactly on the first pin", () => {
    expect(computeRepeatGroups(ring40, clicks, 9, true)).toEqual([ids(1, 5), ids(11, 15), ids(21, 25), ids(31, 35)]);
  });

  it("full-fill keeps the cycle that overshoots the first pin", () => {
    const groups = computeRepeatGroups(layerOf(circlePath("a", ids(1, 35))), ["1", "2", "11", "12"], 1, true);
    expect(groups).toEqual([["1", "2"], ["11", "12"], ["21", "22"], ["31", "32"], ["6", "7"]]);
  });
});

describe("fullFillCycleCount", () => {
  it("excludes the exact lap and keeps the first overshoot", () => {
    expect(fullFillCycleCount(10, 40)).toBe(2);
    expect(fullFillCycleCount(-10, 40)).toBe(2);
    expect(fullFillCycleCount(10, 35)).toBe(3);
  });

  it("generates nothing for a zero step or a step of a whole lap", () => {
    expect(fullFillCycleCount(0, 40)).toBe(0);
    expect(fullFillCycleCount(40, 40)).toBe(0);
    expect(fullFillCycleCount(50, 40)).toBe(0);
  });
});

describe("buildRepeatThreadPins", () => {
  const groups = [["1", "2"], ["11", "12"], ["21", "22"]];

  it("returns one continuous path for a single colour", () => {
    expect(buildRepeatThreadPins(groups, 1)).toEqual([["1", "2", "11", "12", "21", "22"]]);
  });

  it("starts every later group at the previous group's last pin", () => {
    expect(buildRepeatThreadPins(groups, 2)).toEqual([["1", "2"], ["2", "11", "12"], ["12", "21", "22"]]);
  });
});
