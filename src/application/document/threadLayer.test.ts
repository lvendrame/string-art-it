import { describe, expect, it } from "vitest";
import {
  addThreadPathToLayers,
  createThreadLayer,
  duplicateThreadLayer,
  findThreadPath,
  isThreadLayerLocked,
  mergeThreadLayerAbove,
  remapPinsInAllThreadLayers,
  remapPinsInAllThreadLayersByMap,
  removePinFromAllThreadLayers,
  removeThreadPathFromLayers,
  splitThreadPathInLayer,
  updateThreadPathInLayers,
  type ThreadLayer,
} from "./threadLayer";
import { createThreadPath } from "./threadPath";

function layerWith(id: string, paths: ReturnType<typeof createThreadPath>[] = [], locked = false): ThreadLayer {
  return { id, name: id, visible: true, locked, threadPaths: paths };
}

describe("createThreadLayer", () => {
  it("creates an empty, visible, unlocked layer", () => {
    const layer = createThreadLayer("My Layer");
    expect(layer.name).toBe("My Layer");
    expect(layer.visible).toBe(true);
    expect(layer.locked).toBe(false);
    expect(layer.threadPaths).toEqual([]);
  });
});

describe("isThreadLayerLocked", () => {
  it("returns the layer's locked state", () => {
    const layers = [layerWith("l1", [], true)];
    expect(isThreadLayerLocked(layers, "l1")).toBe(true);
  });

  it("returns false for an unknown layer id", () => {
    expect(isThreadLayerLocked([], "missing")).toBe(false);
  });
});

describe("addThreadPathToLayers / removeThreadPathFromLayers / findThreadPath", () => {
  it("adds a thread path to the matching layer only", () => {
    const path = createThreadPath(["p1", "p2"], ["red"], 1);
    const layers = [layerWith("l1"), layerWith("l2")];
    const result = addThreadPathToLayers(layers, "l1", path);
    expect(result[0].threadPaths).toEqual([path]);
    expect(result[1].threadPaths).toEqual([]);
  });

  it("finds a thread path by layer and path id", () => {
    const path = createThreadPath(["p1", "p2"], ["red"], 1);
    const layers = [layerWith("l1", [path])];
    expect(findThreadPath(layers, "l1", path.id)).toBe(path);
  });

  it("returns undefined for a path id not on the layer", () => {
    const layers = [layerWith("l1")];
    expect(findThreadPath(layers, "l1", "missing")).toBeUndefined();
  });

  it("removes a thread path from the matching layer only, leaving other layers untouched", () => {
    const path = createThreadPath(["p1", "p2"], ["red"], 1);
    const other = layerWith("l2");
    const layers = [layerWith("l1", [path]), other];
    const result = removeThreadPathFromLayers(layers, "l1", path.id);
    expect(result[0].threadPaths).toEqual([]);
    expect(result[1]).toBe(other);
  });
});

describe("updateThreadPathInLayers", () => {
  it("applies the updater only to the matching path on the matching layer, leaving other layers untouched", () => {
    const path = createThreadPath(["p1", "p2"], ["red"], 1);
    const otherPath = createThreadPath(["p3", "p4"], ["blue"], 1);
    const other = layerWith("l2", [otherPath]);
    const layers = [layerWith("l1", [path]), other];
    const result = updateThreadPathInLayers(layers, "l1", path.id, (p) => ({ ...p, width: 5 }));
    expect(result[0].threadPaths[0].width).toBe(5);
    expect(result[1]).toBe(other);
  });

  it("leaves a non-matching path on the matching layer untouched", () => {
    const path = createThreadPath(["p1", "p2"], ["red"], 1);
    const other = createThreadPath(["p3", "p4"], ["blue"], 1);
    const layers = [layerWith("l1", [path, other])];
    const result = updateThreadPathInLayers(layers, "l1", path.id, (p) => ({ ...p, width: 5 }));
    expect(result[0].threadPaths[1]).toBe(other);
  });
});

describe("duplicateThreadLayer", () => {
  it("copies the layer with a fresh id, ' copy' name, and fresh thread path ids", () => {
    const path = createThreadPath(["p1", "p2"], ["red"], 1);
    const layer = layerWith("l1", [path]);
    const dup = duplicateThreadLayer(layer);
    expect(dup.id).not.toBe(layer.id);
    expect(dup.name).toBe("l1 copy");
    expect(dup.threadPaths[0].id).not.toBe(path.id);
    expect(dup.threadPaths[0].pinIds).toEqual(path.pinIds);
  });
});

describe("mergeThreadLayerAbove", () => {
  it("moves the layer's threadPaths into the layer above, appended after its existing content, and removes the layer", () => {
    const above = createThreadPath(["p1", "p2"], ["red"], 1);
    const below = createThreadPath(["p3", "p4"], ["blue"], 1);
    const layers = [layerWith("l1", [above]), layerWith("l2", [below])];

    const next = mergeThreadLayerAbove(layers, "l2");

    expect(next).toHaveLength(1);
    expect(next[0].id).toBe("l1");
    expect(next[0].threadPaths).toEqual([above, below]);
  });

  it("is a no-op on the topmost layer (no layer above)", () => {
    const layers = [layerWith("l1")];
    const next = mergeThreadLayerAbove(layers, "l1");
    expect(next).toBe(layers);
  });

  it("does not mutate the original layers array", () => {
    const above = createThreadPath(["p1", "p2"], ["red"], 1);
    const below = createThreadPath(["p3", "p4"], ["blue"], 1);
    const layers = [layerWith("l1", [above]), layerWith("l2", [below])];
    mergeThreadLayerAbove(layers, "l2");
    expect(layers).toHaveLength(2);
    expect(layers[1].threadPaths).toEqual([below]);
  });
});

describe("removePinFromAllThreadLayers", () => {
  it("fragments the thread path around the removed pin, across every layer", () => {
    const path = createThreadPath(["p1", "p2", "p3", "p4", "p5"], ["red"], 1);
    const layers = [layerWith("l1", [path])];
    const result = removePinFromAllThreadLayers(layers, "p3");
    expect(result[0].threadPaths.map((p) => p.pinIds)).toEqual([["p1", "p2"], ["p4", "p5"]]);
  });
});

describe("splitThreadPathInLayer", () => {
  it("replaces the matching path with its split fragments, leaving other layers untouched", () => {
    const path = createThreadPath(["p1", "p2", "p3", "p4"], ["red"], 1);
    const other = layerWith("l2");
    const layers = [layerWith("l1", [path]), other];
    const result = splitThreadPathInLayer(layers, "l1", path.id, 1);
    expect(result[0].threadPaths).toHaveLength(2);
    expect(result[1]).toBe(other);
  });

  it("leaves a non-matching path on the matching layer untouched", () => {
    const path = createThreadPath(["p1", "p2", "p3", "p4"], ["red"], 1);
    const other = createThreadPath(["p5", "p6"], ["blue"], 1);
    const layers = [layerWith("l1", [path, other])];
    const result = splitThreadPathInLayer(layers, "l1", path.id, 1);
    expect(result[0].threadPaths.at(-1)).toBe(other);
  });
});

describe("remapPinsInAllThreadLayers", () => {
  it("remaps every occurrence of an old pin id to the new one, across all layers", () => {
    const path = createThreadPath(["p1", "p2"], ["red"], 1);
    const layers = [layerWith("l1", [path])];
    const result = remapPinsInAllThreadLayers(layers, new Set(["p1"]), "p1-merged");
    expect(result[0].threadPaths[0].pinIds).toEqual(["p1-merged", "p2"]);
  });
});

describe("remapPinsInAllThreadLayersByMap", () => {
  it("remaps pins per a 1:1 old->new id mapping, across all layers", () => {
    const path = createThreadPath(["p1", "p2"], ["red"], 1);
    const layers = [layerWith("l1", [path])];
    const result = remapPinsInAllThreadLayersByMap(layers, new Map([["p1", "p1-new"]]));
    expect(result[0].threadPaths[0].pinIds).toEqual(["p1-new", "p2"]);
  });
});
