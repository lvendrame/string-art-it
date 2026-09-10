import { describe, expect, it } from "vitest";
import { EditorStore } from "./EditorStore";

describe("EditorStore thread twist pitch (Phase 2)", () => {
  it("new threads bake in the current default twist pitch", () => {
    const store = new EditorStore();
    store.setThreadDefaults({ twistPitch: 12 });
    const layerId = store.getState().pinLayers[0].id;
    store.addPinPath(layerId, { type: "line", start: { x: 0, y: 0 }, end: { x: 5, y: 0 } });
    const pins = store.getState().pinLayers[0].pinPaths[0].pins;
    const threadLayerId = store.getState().threadLayers[0].id;

    store.extendThreadDraft(pins[0].id);
    store.finishThreadDraftWithSegment(threadLayerId, pins[1].id);

    expect(store.getState().threadLayers[0].threadPaths[0].twistPitch).toBe(12);
  });

  it("duplicating a thread layer preserves twist pitch", () => {
    const store = new EditorStore();
    store.setThreadDefaults({ twistPitch: 10 });
    const layerId = store.getState().pinLayers[0].id;
    store.addPinPath(layerId, { type: "line", start: { x: 0, y: 0 }, end: { x: 5, y: 0 } });
    const pins = store.getState().pinLayers[0].pinPaths[0].pins;
    const threadLayerId = store.getState().threadLayers[0].id;
    store.extendThreadDraft(pins[0].id);
    store.finishThreadDraftWithSegment(threadLayerId, pins[1].id);

    store.duplicateThreadLayer(threadLayerId);

    expect(store.getState().threadLayers[1].threadPaths[0].twistPitch).toBe(10);
  });
});
