import { describe, expect, it } from "vitest";
import { EditorStore } from "./EditorStore";

function setup(count = 40) {
  const store = new EditorStore();
  const layerId = store.getState().pinLayers[0].id;
  store.addPinPath(layerId, { type: "circle", center: { x: 0, y: 0 }, radius: count });
  store.setPinProperty({ spacing: (2 * Math.PI * count) / count });
  const pins = store.getState().pinLayers[0].pinPaths[0].pins;
  const threadLayerId = store.getState().threadLayers[0].id;
  store.setMode("thread");
  store.setThreadTool("repeat");
  const click = (...numbers: number[]) => numbers.forEach((n) => store.extendRepeatDraft(pins[n - 1].id));
  const idsOf = (...numbers: number[]) => numbers.map((n) => pins[n - 1].id);
  return { store, threadLayerId, click, idsOf };
}

describe("EditorStore Repeat tool", () => {
  it("commits the clicked and generated groups as one continuous Thread Path", () => {
    const { store, threadLayerId, click, idsOf } = setup();
    store.setRepeatSettings({ cycles: 2 });
    click(1, 2, 11, 12);
    store.generateRepeatDraft(threadLayerId);

    const threads = store.getState().threadLayers[0].threadPaths;
    expect(threads).toHaveLength(1);
    expect(threads[0].pinIds).toEqual(idsOf(1, 2, 11, 12, 21, 22, 31, 32));
    expect(threads[0].colours).toEqual(store.getState().repeatSettings.colours);
    expect(store.getState().repeatDraft).toBeNull();
  });

  it("splits groups into alternating colours as one undo step", () => {
    const { store, threadLayerId, click, idsOf } = setup();
    store.setRepeatSettings({ cycles: 1, colours: ["#111111", "#222222"] });
    click(1, 2, 11, 12);
    store.generateRepeatDraft(threadLayerId);

    const threads = store.getState().threadLayers[0].threadPaths;
    expect(threads.map((t) => t.pinIds)).toEqual([idsOf(1, 2), idsOf(2, 11, 12), idsOf(12, 21, 22)]);
    expect(threads.map((t) => t.colours)).toEqual([["#111111"], ["#222222"], ["#111111"]]);

    store.undo();
    expect(store.getState().threadLayers[0].threadPaths).toHaveLength(0);
  });

  it("ignores colours beyond cycles + 2", () => {
    const { store, threadLayerId, click } = setup();
    store.setRepeatSettings({ cycles: 0, colours: ["#111111", "#222222", "#333333"] });
    click(1, 2, 11, 12);
    store.generateRepeatDraft(threadLayerId);
    expect(store.getState().threadLayers[0].threadPaths.map((t) => t.colours)).toEqual([["#111111"], ["#222222"]]);
  });

  it("keeps the draft when fewer than 4 pins are picked", () => {
    const { store, threadLayerId, click } = setup();
    click(1, 2, 11);
    store.generateRepeatDraft(threadLayerId);
    expect(store.getState().threadLayers[0].threadPaths).toHaveLength(0);
    expect(store.getState().repeatDraft?.pinIds).toHaveLength(3);
  });

  it("discards the draft on a locked layer", () => {
    const { store, threadLayerId, click } = setup();
    store.toggleThreadLayerLocked(threadLayerId);
    click(1, 2, 11, 12);
    store.generateRepeatDraft(threadLayerId);
    expect(store.getState().threadLayers[0].threadPaths).toHaveLength(0);
    expect(store.getState().repeatDraft).toBeNull();
  });

  it("ignores a repeated click on the last pin", () => {
    const { store, click } = setup();
    click(1, 1, 2);
    expect(store.getState().repeatDraft?.pinIds).toHaveLength(2);
  });

  it("retracts, then cancels", () => {
    const { store, click } = setup();
    click(1, 2);
    store.retractRepeatDraft();
    expect(store.getState().repeatDraft?.pinIds).toHaveLength(1);
    store.retractRepeatDraft();
    expect(store.getState().repeatDraft).toBeNull();
    store.retractRepeatDraft();
    click(1, 2);
    store.cancelRepeatDraft();
    expect(store.getState().repeatDraft).toBeNull();
    store.cancelRepeatDraft();
    store.generateRepeatDraft("any");
    expect(store.getState().repeatDraft).toBeNull();
  });

  it("discards the draft when switching tool or leaving Thread mode", () => {
    const { store, click } = setup();
    click(1, 2);
    store.setThreadTool("repeat");
    expect(store.getState().repeatDraft).not.toBeNull();
    store.setThreadTool("draw");
    expect(store.getState().repeatDraft).toBeNull();

    store.setThreadTool("repeat");
    click(1, 2);
    store.setMode("pin");
    expect(store.getState().repeatDraft).toBeNull();
  });
});
