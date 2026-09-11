import { describe, expect, it } from "vitest";
import { EditorStore } from "./EditorStore";

function seedPins(store: EditorStore, count: number) {
  const layerId = store.getState().pinLayers[0].id;
  const pathId = store.addPinPath(layerId, { type: "line", start: { x: 0, y: 0 }, end: { x: count - 1, y: 0 } })!;
  return { layerId, pathId, pins: store.getState().pinLayers[0].pinPaths[0].pins };
}

describe("EditorStore thread drawing workflow", () => {
  it("building A -> B -> C -> D stores one Thread Path with those pin ids in order", () => {
    const store = new EditorStore();
    const { pins } = seedPins(store, 4);
    const threadLayerId = store.getState().threadLayers[0].id;

    store.extendThreadDraft(pins[0].id);
    store.extendThreadDraft(pins[1].id);
    store.extendThreadDraft(pins[2].id);
    store.finishThreadDraftWithSegment(threadLayerId, pins[3].id);

    const threads = store.getState().threadLayers[0].threadPaths;
    expect(threads).toHaveLength(1);
    expect(threads[0].pinIds).toEqual([pins[0].id, pins[1].id, pins[2].id, pins[3].id]);
    expect(store.getState().threadDraft).toBeNull();
  });

  it("committing a Thread Path is undoable", () => {
    const store = new EditorStore();
    const { pins } = seedPins(store, 2);
    const threadLayerId = store.getState().threadLayers[0].id;

    store.extendThreadDraft(pins[0].id);
    store.finishThreadDraftWithSegment(threadLayerId, pins[1].id);
    expect(store.getState().threadLayers[0].threadPaths).toHaveLength(1);

    store.undo();
    expect(store.getState().threadLayers[0].threadPaths).toHaveLength(0);
  });

  it("right-click (finishThreadDraft) finishes without adding a pending segment", () => {
    const store = new EditorStore();
    const { pins } = seedPins(store, 3);
    const threadLayerId = store.getState().threadLayers[0].id;

    store.extendThreadDraft(pins[0].id);
    store.extendThreadDraft(pins[1].id);
    store.finishThreadDraft(threadLayerId); // no third pin added

    const threads = store.getState().threadLayers[0].threadPaths;
    expect(threads[0].pinIds).toEqual([pins[0].id, pins[1].id]);
  });

  it("Esc with zero confirmed segments cancels outright", () => {
    const store = new EditorStore();
    const { pins } = seedPins(store, 2);
    const threadLayerId = store.getState().threadLayers[0].id;

    store.extendThreadDraft(pins[0].id); // only the origin, 0 segments
    store.escapeThreadDraft(threadLayerId);

    expect(store.getState().threadDraft).toBeNull();
    expect(store.getState().threadLayers[0].threadPaths).toHaveLength(0);
  });

  it("Esc with at least one segment finishes at the last confirmed pin", () => {
    const store = new EditorStore();
    const { pins } = seedPins(store, 2);
    const threadLayerId = store.getState().threadLayers[0].id;

    store.extendThreadDraft(pins[0].id);
    store.extendThreadDraft(pins[1].id);
    store.escapeThreadDraft(threadLayerId);

    expect(store.getState().threadLayers[0].threadPaths).toHaveLength(1);
  });

  it("a thread cannot commit with fewer than 2 pins", () => {
    const store = new EditorStore();
    const { pins } = seedPins(store, 1);
    const threadLayerId = store.getState().threadLayers[0].id;

    store.extendThreadDraft(pins[0].id);
    store.finishThreadDraft(threadLayerId);

    expect(store.getState().threadLayers[0].threadPaths).toHaveLength(0);
  });
});

describe("EditorStore cascading pin deletion into threads", () => {
  it("deleting a pin removes its adjacent thread segments in the same undo step as the pin removal", () => {
    const store = new EditorStore();
    const { layerId, pathId, pins } = seedPins(store, 3); // A-B-C pins
    const threadLayerId = store.getState().threadLayers[0].id;
    store.extendThreadDraft(pins[0].id);
    store.extendThreadDraft(pins[1].id);
    store.finishThreadDraftWithSegment(threadLayerId, pins[2].id); // one thread A-B-C

    store.erasePin(layerId, pathId, pins[1].id); // delete middle pin B

    expect(store.getState().pinLayers[0].pinPaths[0].pins.find((p) => p.id === pins[1].id)).toBeUndefined();
    expect(store.getState().threadLayers[0].threadPaths).toHaveLength(0); // both fragments < 2 pins

    store.undo();
    expect(store.getState().pinLayers[0].pinPaths[0].pins.find((p) => p.id === pins[1].id)).toBeDefined();
    expect(store.getState().threadLayers[0].threadPaths).toHaveLength(1);
  });

  it("deleting a pin referenced by two separate threads cascades across both in one undo step", () => {
    const store = new EditorStore();
    const { layerId, pathId, pins } = seedPins(store, 3);
    const threadLayerId = store.getState().threadLayers[0].id;
    store.extendThreadDraft(pins[0].id);
    store.finishThreadDraftWithSegment(threadLayerId, pins[1].id); // thread 1: A-B
    store.extendThreadDraft(pins[1].id);
    store.finishThreadDraftWithSegment(threadLayerId, pins[2].id); // thread 2: B-C

    store.erasePin(layerId, pathId, pins[1].id);
    expect(store.getState().threadLayers[0].threadPaths).toHaveLength(0);

    store.undo();
    expect(store.getState().threadLayers[0].threadPaths).toHaveLength(2);
  });

  it("retractThreadDraft removes the last confirmed vertex", () => {
    const store = new EditorStore();
    const { pins } = seedPins(store, 3);
    store.extendThreadDraft(pins[0].id);
    store.extendThreadDraft(pins[1].id);
    store.extendThreadDraft(pins[2].id);

    store.retractThreadDraft();

    expect(store.getState().threadDraft?.pinIds).toEqual([pins[0].id, pins[1].id]);
  });

  it("retractThreadDraft on the only confirmed vertex ends the insertion outright", () => {
    const store = new EditorStore();
    const { pins } = seedPins(store, 2);
    store.extendThreadDraft(pins[0].id);

    store.retractThreadDraft();

    expect(store.getState().threadDraft).toBeNull();
  });

  it("retractThreadDraft is a no-op when no draft is in progress", () => {
    const store = new EditorStore();
    seedPins(store, 2);

    store.retractThreadDraft();

    expect(store.getState().threadDraft).toBeNull();
  });
});
