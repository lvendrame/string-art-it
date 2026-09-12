import { describe, expect, it } from "vitest";
import { totalThreadFrames, truncateThreadLayersAtFrame } from "./playback";
import type { ThreadLayer } from "./threadLayer";

function makeLayer(id: string, pinIdsPerPath: string[][]): ThreadLayer {
  return {
    id,
    name: id,
    visible: true,
    locked: false,
    threadPaths: pinIdsPerPath.map((pinIds, i) => ({
      id: `${id}-path-${i}`,
      colours: ["#fff"],
      width: 1,
      pinIds,
      twistPitch: 6,
    })),
  };
}

describe("totalThreadFrames", () => {
  it("sums segment counts across every path in every layer", () => {
    const layers = [
      makeLayer("l1", [["A", "B", "C"], ["D", "E"]]), // 2 + 1 = 3 segments
      makeLayer("l2", [["F", "G", "H", "I"]]), // 3 segments
    ];
    expect(totalThreadFrames(layers)).toBe(6);
  });

  it("is 0 for empty layers", () => {
    expect(totalThreadFrames([makeLayer("l1", [])])).toBe(0);
  });

  it("treats a single-pin path (no segments) as contributing 0", () => {
    expect(totalThreadFrames([makeLayer("l1", [["A"]])])).toBe(0);
  });
});

describe("truncateThreadLayersAtFrame", () => {
  it("frame 0 yields empty threadPaths everywhere", () => {
    const layers = [makeLayer("l1", [["A", "B", "C"]])];
    const result = truncateThreadLayersAtFrame(layers, 0);
    expect(result[0].threadPaths).toEqual([]);
  });

  it("mid-path frame slices pinIds to exactly that many completed segments", () => {
    const layers = [makeLayer("l1", [["A", "B", "C", "D"]])]; // 3 segments
    const result = truncateThreadLayersAtFrame(layers, 2);
    expect(result[0].threadPaths).toHaveLength(1);
    expect(result[0].threadPaths[0].pinIds).toEqual(["A", "B", "C"]);
  });

  it("exact path boundary includes the full path and moves on to the next", () => {
    const layers = [makeLayer("l1", [["A", "B", "C"], ["D", "E", "F"]])]; // 2 + 2 segments
    const result = truncateThreadLayersAtFrame(layers, 2);
    expect(result[0].threadPaths).toHaveLength(1);
    expect(result[0].threadPaths[0].pinIds).toEqual(["A", "B", "C"]);
  });

  it("full total includes every path in every layer, unchanged", () => {
    const layers = [makeLayer("l1", [["A", "B", "C"]]), makeLayer("l2", [["D", "E"]])];
    const total = totalThreadFrames(layers);
    const result = truncateThreadLayersAtFrame(layers, total);
    expect(result).toEqual(layers);
  });

  it("preserves id/colours/width/twistPitch on a truncated path", () => {
    const layers = [makeLayer("l1", [["A", "B", "C", "D"]])];
    const result = truncateThreadLayersAtFrame(layers, 1);
    expect(result[0].threadPaths[0]).toMatchObject({ id: "l1-path-0", colours: ["#fff"], width: 1, twistPitch: 6 });
  });

  it("drops layers/paths entirely beyond the frame budget", () => {
    const layers = [makeLayer("l1", [["A", "B"]]), makeLayer("l2", [["C", "D", "E"]])]; // 1 + 2 segments
    const result = truncateThreadLayersAtFrame(layers, 1);
    expect(result[0].threadPaths).toHaveLength(1);
    expect(result[1].threadPaths).toEqual([]);
  });
});
