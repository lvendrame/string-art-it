import { describe, expect, it } from "vitest";
import { computeRadialSequence } from "./radialSequence";
import type { PinLayer } from "./pinLayer";
import type { PinPath } from "./pinPath";
import type { SymmetryConfig } from "./symmetryConfig";

function linePath(id: string, pinIds: string[], y: number, symmetry: SymmetryConfig = { type: "none" }): PinPath {
  return {
    id,
    geometry: { type: "line", start: { x: 0, y }, end: { x: pinIds.length, y } },
    requestedSpacing: 1,
    actualSpacing: 1,
    pins: pinIds.map((pid, i) => ({ id: pid, x: i, y })),
    guideVisible: true,
    colour: "#fff",
    diameter: 2,
    symmetry,
  };
}

function circlePath(id: string, pinIds: string[]): PinPath {
  return { ...linePath(id, pinIds, 0), geometry: { type: "circle", center: { x: 0, y: 0 }, radius: pinIds.length } };
}

function layerOf(...pinPaths: PinPath[]): PinLayer[] {
  return [{ id: "layer-1", name: "Layer 1", visible: true, locked: false, pinPaths }];
}

function ids(from: number, to: number): string[] {
  return Array.from({ length: to - from + 1 }, (_, i) => String(from + i));
}

describe("computeRadialSequence", () => {
  it("connects the anchor to every pin of a different path, in path order", () => {
    const layers = layerOf(linePath("a", ids(1, 6), 0), linePath("b", ids(7, 12), 10));
    expect(computeRadialSequence(layers, "3", "11")).toEqual(["3", "7", "3", "8", "3", "9", "3", "10", "3", "11", "3", "12"]);
  });

  it("skips the anchor itself when the target path is its own path", () => {
    const layers = layerOf(linePath("a", ids(1, 7), 0));
    expect(computeRadialSequence(layers, "4", "1")).toEqual(["4", "1", "4", "2", "4", "3", "4", "5", "4", "6", "4", "7"]);
  });

  it("uses path order on a closed path regardless of which pin was clicked", () => {
    const layers = layerOf(circlePath("a", ids(1, 5)));
    expect(computeRadialSequence(layers, "1", "4")).toEqual(["1", "2", "1", "3", "1", "4", "1", "5"]);
  });

  it("returns nothing when both clicks are the same pin", () => {
    const layers = layerOf(linePath("a", ids(1, 7), 0));
    expect(computeRadialSequence(layers, "4", "4")).toEqual([]);
  });

  it("returns nothing for unknown pins", () => {
    const layers = layerOf(linePath("a", ids(1, 3), 0));
    expect(computeRadialSequence(layers, "x", "1")).toEqual([]);
    expect(computeRadialSequence(layers, "1", "x")).toEqual([]);
  });

  it("walks the mirrored copy of the target path when a mirrored pin is clicked", () => {
    const layers = layerOf(linePath("a", ids(1, 2), 0), linePath("b", ids(3, 5), 10, { type: "horizontal", axis: { x: 0, y: 0 } }));
    expect(computeRadialSequence(layers, "1", "4~mirror-0")).toEqual(["1", "3~mirror-0", "1", "4~mirror-0", "1", "5~mirror-0"]);
  });

  it("skips a mirrored anchor lying on its own mirrored path", () => {
    const layers = layerOf(linePath("a", ids(1, 3), 0, { type: "horizontal", axis: { x: 0, y: 0 } }));
    expect(computeRadialSequence(layers, "2~mirror-0", "1~mirror-0")).toEqual(["2~mirror-0", "1~mirror-0", "2~mirror-0", "3~mirror-0"]);
  });
});
