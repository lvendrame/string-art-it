import { describe, expect, it } from "vitest";
import { EditorStore } from "./EditorStore";

function seedClosedPins(store: EditorStore, count: number) {
  const layerId = store.getState().pinLayers[0].id;
  const pathId = store.addPinPath(layerId, { type: "circle", center: { x: 0, y: 0 }, radius: count })!;
  store.setPinProperty({ spacing: (2 * Math.PI * count) / count });
  return { layerId, pathId, pins: store.getState().pinLayers[0].pinPaths[0].pins };
}

describe("EditorStore Zig-zag/Parabolic: closed-path full-fill commits separate strands", () => {
  it("clicking two pins on a closed ring with full-fill on creates TWO Thread Paths, not one with a spurious jump segment", () => {
    const store = new EditorStore();
    const { layerId, pins } = seedClosedPins(store, 8);
    const threadLayerId = store.getState().threadLayers[0].id;

    store.setMode("thread");
    store.setThreadTool("zigzag");
    store.setZigzagSettings({ fullFill: true, stepA: 0, stepB: 0 });

    store.startTwoPinDraft("zigzag", pins[0].id); // p1
    store.chooseSecondPin(threadLayerId, pins[2].id); // p3 — both arcs, no 3rd click needed

    const threads = store.getState().threadLayers[0].threadPaths;
    expect(threads).toHaveLength(2);
    // Short arc: p1,p3,p2. Long arc: p1,p3,p8,p4,p7,p5,p6 — matches the pure-function
    // unit tests in twoPinSequence.test.ts exactly.
    expect(threads[0].pinIds).toEqual([pins[0].id, pins[2].id, pins[1].id]);
    expect(threads[1].pinIds).toEqual([pins[0].id, pins[2].id, pins[7].id, pins[3].id, pins[6].id, pins[4].id, pins[5].id]);
    // Each thread's pinIds array is independent — no entry anywhere connects the short
    // arc's own ending pin (p2, threads[0]'s last entry) directly to the long arc's own
    // (A,B) pair restarting it (threads[1]'s first two entries): they're two SEPARATE
    // ThreadPaths, so no segment is ever drawn between them at all. That's the exact bug
    // reported live — clicking pins 68 and 1 on a 70-pin ring previously produced a
    // spurious segment at exactly that boundary, because both arcs had been concatenated
    // into a single ThreadPath instead of committed as separate strands.

    // Layer targeting still respects the active Thread Layer (both strands go to it).
    expect(store.getState().threadLayers.find((l) => l.id === threadLayerId)?.threadPaths).toHaveLength(2);
    expect(layerId).toBeTruthy();
  });

  it("commits as ONE atomic undo step even though two Thread Paths are created", () => {
    const store = new EditorStore();
    const { pins } = seedClosedPins(store, 8);
    const threadLayerId = store.getState().threadLayers[0].id;

    store.setMode("thread");
    store.setThreadTool("zigzag");
    store.setZigzagSettings({ fullFill: true, stepA: 0, stepB: 0 });

    store.startTwoPinDraft("zigzag", pins[0].id);
    store.chooseSecondPin(threadLayerId, pins[2].id);
    expect(store.getState().threadLayers[0].threadPaths).toHaveLength(2);

    store.undo();
    expect(store.getState().threadLayers[0].threadPaths).toHaveLength(0);

    store.redo();
    expect(store.getState().threadLayers[0].threadPaths).toHaveLength(2);
  });

  it("without full-fill, a closed-path pair still commits as a single Thread Path (unchanged)", () => {
    const store = new EditorStore();
    const { pins } = seedClosedPins(store, 8);
    const threadLayerId = store.getState().threadLayers[0].id;

    store.setMode("thread");
    store.setThreadTool("zigzag");
    // default settings: fullFill false — needs the 3rd click since 2 arc candidates exist.
    store.startTwoPinDraft("zigzag", pins[0].id);
    store.chooseSecondPin(threadLayerId, pins[2].id);
    expect(store.getState().twoPinDraft?.candidates).toHaveLength(2);

    store.resolveTwoPinDraft(threadLayerId);
    expect(store.getState().threadLayers[0].threadPaths).toHaveLength(1);
  });
});
