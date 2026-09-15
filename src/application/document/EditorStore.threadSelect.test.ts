import { describe, expect, it } from "vitest";
import { EditorStore } from "./EditorStore";

describe("EditorStore — Thread selection (docs/specs/27-thread-select-tool.md)", () => {
  function seedThread(store: EditorStore) {
    const layerId = store.getState().pinLayers[0].id;
    store.addPinPath(layerId, { type: "line", start: { x: 0, y: 0 }, end: { x: 10, y: 0 } });
    const pins = store.getState().pinLayers[0].pinPaths[0].pins;
    const threadLayerId = store.getState().threadLayers[0].id;
    store.extendThreadDraft(pins[0].id);
    store.finishThreadDraftWithSegment(threadLayerId, pins[1].id);
    const threadPathId = store.getState().threadLayers[0].threadPaths[0].id;
    return { threadLayerId, threadPathId };
  }

  it("getSelectedThreadPath returns undefined unless a threadPath selection is active", () => {
    const store = new EditorStore();
    seedThread(store);
    expect(store.getSelectedThreadPath()).toBeUndefined();
  });

  it("select + getSelectedThreadPath resolves the selected Thread Path", () => {
    const store = new EditorStore();
    const { threadLayerId, threadPathId } = seedThread(store);
    store.select({ type: "threadPath", layerId: threadLayerId, pathId: threadPathId });
    expect(store.getSelectedThreadPath()?.id).toBe(threadPathId);
  });

  it("setThreadProperty edits colours/width on the selected Thread Path, undoable in one step", () => {
    const store = new EditorStore();
    const { threadLayerId, threadPathId } = seedThread(store);
    const original = store.getState().threadLayers[0].threadPaths[0];
    store.select({ type: "threadPath", layerId: threadLayerId, pathId: threadPathId });

    store.setThreadProperty({ colours: ["#ff0000"], width: 3 });

    const updated = store.getState().threadLayers[0].threadPaths.find((t) => t.id === threadPathId)!;
    expect(updated.colours).toEqual(["#ff0000"]);
    expect(updated.width).toBe(3);
    expect(updated.pinIds).toEqual(original.pinIds); // geometry/connectivity untouched

    store.undo();
    expect(store.getState().threadLayers[0].threadPaths.find((t) => t.id === threadPathId)!).toEqual(original);
  });

  it("setThreadProperty does not affect the drawing defaults used by the NEXT thread", () => {
    const store = new EditorStore();
    const { threadLayerId, threadPathId } = seedThread(store);
    const defaultsBefore = store.getState().threadDefaults;
    store.select({ type: "threadPath", layerId: threadLayerId, pathId: threadPathId });

    store.setThreadProperty({ colours: ["#00ff00"] });

    expect(store.getState().threadDefaults).toEqual(defaultsBefore);
  });

  it("setThreadProperty is a no-op on a locked Thread Layer", () => {
    const store = new EditorStore();
    const { threadLayerId, threadPathId } = seedThread(store);
    const original = store.getState().threadLayers[0].threadPaths[0];
    store.select({ type: "threadPath", layerId: threadLayerId, pathId: threadPathId });
    store.toggleThreadLayerLocked(threadLayerId);

    store.setThreadProperty({ colours: ["#ff0000"], width: 9 });

    expect(store.getState().threadLayers[0].threadPaths.find((t) => t.id === threadPathId)!).toEqual(original);
  });

  // docs/specs/27-thread-select-tool.md — same dual-context pattern as setPinProperty:
  // with NO Thread Path selected, setThreadProperty edits the drawing defaults instead.
  it("setThreadProperty edits the drawing defaults when no Thread Path is selected", () => {
    const store = new EditorStore();
    seedThread(store);
    store.select({ type: "none" });

    store.setThreadProperty({ width: 4, twistPitch: 9 });

    expect(store.getState().threadDefaults).toMatchObject({ width: 4, twistPitch: 9 });
  });
});
