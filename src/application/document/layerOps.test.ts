import { describe, expect, it } from "vitest";
import { deleteLayer, renameLayer, reorderLayer, toggleLayerLocked, toggleLayerVisible } from "./layerOps";

interface TestLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
}

function layer(id: string): TestLayer {
  return { id, name: id, visible: true, locked: false };
}

describe("renameLayer", () => {
  it("renames the matching layer, leaving others untouched", () => {
    const layers = [layer("a"), layer("b")];
    const result = renameLayer(layers, "a", "new-name");
    expect(result[0].name).toBe("new-name");
    expect(result[1]).toBe(layers[1]);
  });

  it("returns the list unchanged (same layer objects) when no id matches", () => {
    const layers = [layer("a")];
    const result = renameLayer(layers, "missing", "x");
    expect(result[0]).toBe(layers[0]);
  });
});

describe("toggleLayerVisible", () => {
  it("flips visible on the matching layer", () => {
    const layers = [layer("a")];
    expect(toggleLayerVisible(layers, "a")[0].visible).toBe(false);
  });

  it("leaves a non-matching layer untouched", () => {
    const layers = [layer("a")];
    const result = toggleLayerVisible(layers, "missing");
    expect(result[0]).toBe(layers[0]);
  });
});

describe("toggleLayerLocked", () => {
  it("flips locked on the matching layer", () => {
    const layers = [layer("a")];
    expect(toggleLayerLocked(layers, "a")[0].locked).toBe(true);
  });

  it("leaves a non-matching layer untouched", () => {
    const layers = [layer("a")];
    const result = toggleLayerLocked(layers, "missing");
    expect(result[0]).toBe(layers[0]);
  });
});

describe("deleteLayer", () => {
  it("removes the matching layer", () => {
    const layers = [layer("a"), layer("b")];
    expect(deleteLayer(layers, "a").map((l) => l.id)).toEqual(["b"]);
  });
});

describe("reorderLayer", () => {
  it("swaps with the previous layer when direction is -1", () => {
    const layers = [layer("a"), layer("b"), layer("c")];
    expect(reorderLayer(layers, "b", -1).map((l) => l.id)).toEqual(["b", "a", "c"]);
  });

  it("swaps with the next layer when direction is +1", () => {
    const layers = [layer("a"), layer("b"), layer("c")];
    expect(reorderLayer(layers, "b", 1).map((l) => l.id)).toEqual(["a", "c", "b"]);
  });

  it("is a no-op when the id isn't found", () => {
    const layers = [layer("a"), layer("b")];
    expect(reorderLayer(layers, "missing", 1)).toBe(layers);
  });

  it("is a no-op moving the first layer up", () => {
    const layers = [layer("a"), layer("b")];
    expect(reorderLayer(layers, "a", -1)).toBe(layers);
  });

  it("is a no-op moving the last layer down", () => {
    const layers = [layer("a"), layer("b")];
    expect(reorderLayer(layers, "b", 1)).toBe(layers);
  });
});
