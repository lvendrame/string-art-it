import { describe, expect, it } from "vitest";
import { EditorStore } from "./EditorStore";
import type { GeneratorParams } from "./generator/generatorPatterns";

const MANDALA_PARAMS: GeneratorParams = { patternId: "mandala", n: 40, base: 3, layers: 1 };

describe("EditorStore — Generator mode (docs/specs/32-generator-mode.md)", () => {
  it("generatePattern builds a draft and is NOT recorded in history", () => {
    const store = new EditorStore();
    store.generatePattern(MANDALA_PARAMS, ["#5b8def"]);
    const draft = store.getState().generatorDraft;
    expect(draft).not.toBeNull();
    expect(draft?.pinPaths).toHaveLength(1);
    expect(draft?.pinPaths[0].pins).toHaveLength(40);
    expect(store.canUndo()).toBe(false);
  });

  it("generatePattern again (Re-generate) fully replaces the previous draft", () => {
    const store = new EditorStore();
    store.generatePattern(MANDALA_PARAMS, ["#5b8def"]);
    const firstPinIds = store.getState().generatorDraft?.pinPaths[0].pins.map((p) => p.id);

    store.generatePattern({ patternId: "mandala", n: 20, base: 3, layers: 1 }, ["#5b8def"]);
    const draft = store.getState().generatorDraft;
    expect(draft?.pinPaths[0].pins).toHaveLength(20);
    const secondPinIds = draft?.pinPaths[0].pins.map((p) => p.id);
    expect(secondPinIds).not.toEqual(firstPinIds);
    expect(store.canUndo()).toBe(false);
  });

  it("switching Editor mode away from generate discards an uncommitted draft", () => {
    const store = new EditorStore();
    store.setMode("generate");
    store.generatePattern(MANDALA_PARAMS, ["#5b8def"]);
    expect(store.getState().generatorDraft).not.toBeNull();

    store.setMode("select");
    expect(store.getState().generatorDraft).toBeNull();
  });

  it("re-entering generate mode does not resurrect a discarded draft", () => {
    const store = new EditorStore();
    store.setMode("generate");
    store.generatePattern(MANDALA_PARAMS, ["#5b8def"]);
    store.setMode("pin");
    store.setMode("generate");
    expect(store.getState().generatorDraft).toBeNull();
  });

  it("confirmGeneratedPattern with no draft is a no-op", () => {
    const store = new EditorStore();
    const before = store.getState();
    store.confirmGeneratedPattern();
    expect(store.getState()).toBe(before);
    expect(store.canUndo()).toBe(false);
  });

  it("confirmGeneratedPattern creates exactly 2 new permanent layers, in ONE undo step, and clears the draft", () => {
    const store = new EditorStore();
    const pinLayersBefore = store.getState().pinLayers.length;
    const threadLayersBefore = store.getState().threadLayers.length;

    store.generatePattern(MANDALA_PARAMS, ["#5b8def"]);
    store.confirmGeneratedPattern();

    const state = store.getState();
    expect(state.pinLayers).toHaveLength(pinLayersBefore + 1);
    expect(state.threadLayers).toHaveLength(threadLayersBefore + 1);
    expect(state.generatorDraft).toBeNull();
    expect(state.pinLayers.at(-1)?.pinPaths[0].pins).toHaveLength(40);
    expect(state.pinLayers.at(-1)?.name).toBe("Generated — Mandala");
    expect(state.activePinLayerId).toBe(state.pinLayers.at(-1)?.id);
    expect(state.activeThreadLayerId).toBe(state.threadLayers.at(-1)?.id);

    expect(store.canUndo()).toBe(true);
    store.undo();
    const undone = store.getState();
    expect(undone.pinLayers).toHaveLength(pinLayersBefore);
    expect(undone.threadLayers).toHaveLength(threadLayersBefore);
  });

  it("confirmGeneratedPattern never touches any existing layer (locked or not) — it only ever creates new ones", () => {
    const store = new EditorStore();
    const originalPinLayerId = store.getState().activePinLayerId;
    store.togglePinLayerLocked(originalPinLayerId);
    store.generatePattern(MANDALA_PARAMS, ["#5b8def"]);
    store.confirmGeneratedPattern();
    const state = store.getState();
    const originalLayer = state.pinLayers.find((l) => l.id === originalPinLayerId);
    expect(originalLayer?.pinPaths).toHaveLength(0);
    expect(state.pinLayers).toHaveLength(2);
  });
});
