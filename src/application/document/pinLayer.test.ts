import { describe, expect, it } from "vitest";
import { mergePinsInLayers, type PinLayer } from "./pinLayer";
import type { Pin } from "./pinPath";

function pin(id: string, x: number, y: number): Pin {
  return { id, x, y };
}

function makeLayers(): PinLayer[] {
  return [
    {
      id: "layer-1",
      name: "Layer 1",
      visible: true,
      locked: false,
      pinPaths: [
        { id: "path-a", geometry: { type: "line", start: { x: 0, y: 0 }, end: { x: 10, y: 0 } }, requestedSpacing: 1, actualSpacing: 1, pins: [pin("A1", 0, 0), pin("A2", 5, 0)], guideVisible: true, colour: "#fff", diameter: 2, symmetry: { type: "none" } },
        { id: "path-b", geometry: { type: "line", start: { x: 0, y: 10 }, end: { x: 10, y: 10 } }, requestedSpacing: 1, actualSpacing: 1, pins: [pin("B1", 0, 10)], guideVisible: true, colour: "#fff", diameter: 2, symmetry: { type: "none" } },
      ],
    },
  ];
}

describe("mergePinsInLayers", () => {
  it("removes every merged-away pin from wherever it lived, and adds the new pin only at the destination", () => {
    const layers = makeLayers();
    const newPin = pin("M1", 2.5, 5);
    const next = mergePinsInLayers(layers, new Set(["A2", "B1"]), { layerId: "layer-1", pathId: "path-a" }, newPin);

    const pathA = next[0].pinPaths.find((p) => p.id === "path-a")!;
    const pathB = next[0].pinPaths.find((p) => p.id === "path-b")!;

    expect(pathA.pins.map((p) => p.id)).toEqual(["A1", "M1"]);
    expect(pathB.pins.map((p) => p.id)).toEqual([]);
  });

  it("does not mutate the original layers array", () => {
    const layers = makeLayers();
    mergePinsInLayers(layers, new Set(["A2"]), { layerId: "layer-1", pathId: "path-a" }, pin("M1", 1, 1));
    expect(layers[0].pinPaths[0].pins.map((p) => p.id)).toEqual(["A1", "A2"]);
  });
});
