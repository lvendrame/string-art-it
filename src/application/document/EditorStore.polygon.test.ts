import { describe, expect, it } from "vitest";
import { EditorStore } from "./EditorStore";

// docs/specs/33-pin-path-tool.md — the Path tool's click-per-vertex draft.
describe("EditorStore Pin Path (Polygon) draft", () => {
  it("extendPolygonDraft starts a draft with the first click and grows it with each further click", () => {
    const store = new EditorStore();
    store.extendPolygonDraft({ x: 0, y: 0 });
    expect(store.getState().polygonDraft).toEqual({ points: [{ x: 0, y: 0 }] });

    store.extendPolygonDraft({ x: 1, y: 0 });
    store.extendPolygonDraft({ x: 1, y: 1 });
    expect(store.getState().polygonDraft).toEqual({
      points: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }],
    });
  });

  it("finishPolygonDraft commits a closed Pin Path once there are 3+ vertices", () => {
    const store = new EditorStore();
    const layerId = store.getState().activePinLayerId;
    store.extendPolygonDraft({ x: 0, y: 0 });
    store.extendPolygonDraft({ x: 4, y: 0 });
    store.extendPolygonDraft({ x: 4, y: 4 });
    store.extendPolygonDraft({ x: 0, y: 4 });

    store.finishPolygonDraft(layerId);

    expect(store.getState().polygonDraft).toBeNull();
    const paths = store.getState().pinLayers[0].pinPaths;
    expect(paths).toHaveLength(1);
    expect(paths[0].geometry).toEqual({
      type: "polygon",
      points: [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 4 }, { x: 0, y: 4 }],
    });
    // addPinPath's existing "hand off to Edit mode with it selected" behaviour.
    expect(store.getState().mode).toBe("select");
    expect(store.getState().selection).toEqual({ type: "pinPaths", refs: [{ layerId, pathId: paths[0].id }] });
  });

  it("committing a Path Pin Path is undoable", () => {
    const store = new EditorStore();
    const layerId = store.getState().activePinLayerId;
    store.extendPolygonDraft({ x: 0, y: 0 });
    store.extendPolygonDraft({ x: 4, y: 0 });
    store.extendPolygonDraft({ x: 4, y: 4 });
    store.finishPolygonDraft(layerId);
    expect(store.getState().pinLayers[0].pinPaths).toHaveLength(1);

    store.undo();
    expect(store.getState().pinLayers[0].pinPaths).toHaveLength(0);
  });

  it("finishPolygonDraft discards a draft with fewer than 3 vertices", () => {
    const store = new EditorStore();
    const layerId = store.getState().activePinLayerId;
    store.extendPolygonDraft({ x: 0, y: 0 });
    store.extendPolygonDraft({ x: 4, y: 0 });

    store.finishPolygonDraft(layerId);

    expect(store.getState().polygonDraft).toBeNull();
    expect(store.getState().pinLayers[0].pinPaths).toHaveLength(0);
  });

  it("escapePolygonDraft behaves identically to finishPolygonDraft (commit at 3+, discard below)", () => {
    const store = new EditorStore();
    const layerId = store.getState().activePinLayerId;
    store.extendPolygonDraft({ x: 0, y: 0 });
    store.extendPolygonDraft({ x: 4, y: 0 });
    store.extendPolygonDraft({ x: 4, y: 4 });

    store.escapePolygonDraft(layerId);

    expect(store.getState().pinLayers[0].pinPaths).toHaveLength(1);
    expect(store.getState().pinLayers[0].pinPaths[0].geometry.type).toBe("polygon");
  });

  it("retractPolygonDraft removes the last vertex", () => {
    const store = new EditorStore();
    store.extendPolygonDraft({ x: 0, y: 0 });
    store.extendPolygonDraft({ x: 1, y: 0 });
    store.extendPolygonDraft({ x: 1, y: 1 });

    store.retractPolygonDraft();

    expect(store.getState().polygonDraft).toEqual({ points: [{ x: 0, y: 0 }, { x: 1, y: 0 }] });
  });

  it("retractPolygonDraft on the only vertex cancels the draft entirely", () => {
    const store = new EditorStore();
    store.extendPolygonDraft({ x: 0, y: 0 });

    store.retractPolygonDraft();

    expect(store.getState().polygonDraft).toBeNull();
  });

  it("retractPolygonDraft is a no-op when no draft is in progress", () => {
    const store = new EditorStore();
    store.retractPolygonDraft();
    expect(store.getState().polygonDraft).toBeNull();
  });

  it("cancelPolygonDraft discards the draft outright, even with 3+ vertices that could otherwise commit", () => {
    const store = new EditorStore();
    const layerId = store.getState().activePinLayerId;
    store.extendPolygonDraft({ x: 0, y: 0 });
    store.extendPolygonDraft({ x: 4, y: 0 });
    store.extendPolygonDraft({ x: 4, y: 4 });
    store.extendPolygonDraft({ x: 0, y: 4 });
    store.extendPolygonDraft({ x: 0, y: 2 });

    store.cancelPolygonDraft();

    expect(store.getState().polygonDraft).toBeNull();
    expect(store.getState().pinLayers[0].pinPaths).toHaveLength(0);

    // Confirm it really was discarded outright, not just cleared-then-committed.
    store.finishPolygonDraft(layerId);
    expect(store.getState().pinLayers[0].pinPaths).toHaveLength(0);
  });

  it("finishing on a locked Pin Layer discards the draft, same as fewer than 3 vertices", () => {
    const store = new EditorStore();
    const layerId = store.getState().activePinLayerId;
    store.togglePinLayerLocked(layerId);
    store.extendPolygonDraft({ x: 0, y: 0 });
    store.extendPolygonDraft({ x: 4, y: 0 });
    store.extendPolygonDraft({ x: 4, y: 4 });

    store.finishPolygonDraft(layerId);

    expect(store.getState().polygonDraft).toBeNull();
    expect(store.getState().pinLayers[0].pinPaths).toHaveLength(0);
  });

  it("switching Pin tool away from Path discards an in-progress draft", () => {
    const store = new EditorStore();
    store.setPinTool("polygon");
    store.extendPolygonDraft({ x: 0, y: 0 });
    store.extendPolygonDraft({ x: 4, y: 0 });
    store.extendPolygonDraft({ x: 4, y: 4 });

    store.setPinTool("line");

    expect(store.getState().polygonDraft).toBeNull();
  });

  it("switching Editor mode away from Pin discards an in-progress draft", () => {
    const store = new EditorStore();
    store.extendPolygonDraft({ x: 0, y: 0 });
    store.extendPolygonDraft({ x: 4, y: 0 });
    store.extendPolygonDraft({ x: 4, y: 4 });

    store.setMode("pan");

    expect(store.getState().polygonDraft).toBeNull();
  });

  it("a committed Path Pin Path is vertex-anchored: every vertex gets a pin, including the closing edge", () => {
    const store = new EditorStore();
    const layerId = store.getState().activePinLayerId;
    // A 4x4 square, 1cm default spacing: each 4cm edge gets exactly 4 pins
    // (closestIntervalCount(4, 1) = 4), and only one of them is shared with the
    // next edge's start (no duplicate seam pin) — 4 edges * 4 = 16 total pins,
    // same "closing edge counted once" guarantee as Rectangle/Square.
    store.extendPolygonDraft({ x: 0, y: 0 });
    store.extendPolygonDraft({ x: 4, y: 0 });
    store.extendPolygonDraft({ x: 4, y: 4 });
    store.extendPolygonDraft({ x: 0, y: 4 });

    store.finishPolygonDraft(layerId);

    const path = store.getState().pinLayers[0].pinPaths[0];
    expect(path.pins).toHaveLength(16);
    // Every clicked vertex is present as a pin.
    for (const vertex of [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 4 }, { x: 0, y: 4 }]) {
      expect(path.pins.some((p) => p.x === vertex.x && p.y === vertex.y)).toBe(true);
    }
  });
});
