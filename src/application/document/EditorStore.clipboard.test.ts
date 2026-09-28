import { describe, expect, it } from "vitest";
import { EditorStore } from "./EditorStore";
import { PASTE_OFFSET } from "./clipboard";

function seed(store: EditorStore) {
  const layerId = store.getState().pinLayers[0].id;
  const pathIdA = store.addPinPath(layerId, { type: "line", start: { x: 0, y: 0 }, end: { x: 10, y: 0 } })!;
  const pathIdB = store.addPinPath(layerId, { type: "line", start: { x: 0, y: 5 }, end: { x: 10, y: 5 } })!;
  const pathIdC = store.addPinPath(layerId, { type: "line", start: { x: 0, y: 10 }, end: { x: 10, y: 10 } })!;
  const [a, b] = store.getState().pinLayers[0].pinPaths;
  const threadLayerId = store.getState().threadLayers[0].id;
  store.extendThreadDraft(a.pins[0].id);
  store.finishThreadDraftWithSegment(threadLayerId, b.pins[0].id);
  const threadPathId = store.getState().threadLayers[0].threadPaths[0].id;
  return { layerId, pathIdA, pathIdB, pathIdC, threadLayerId, threadPathId };
}

function counts(store: EditorStore) {
  const s = store.getState();
  return { paths: s.pinLayers[0].pinPaths.length, threads: s.threadLayers[0].threadPaths.length };
}

describe("EditorStore — copy/paste", () => {
  it("copy returns null with nothing selected", () => {
    const store = new EditorStore();
    seed(store);
    store.select({ type: "none" });
    expect(store.copySelection()).toBeNull();
  });

  it("copying a Pin Path includes its threads and the paths they reach", () => {
    const store = new EditorStore();
    const { layerId, pathIdA, pathIdB, threadPathId } = seed(store);
    store.select({ type: "pinPaths", refs: [{ layerId, pathId: pathIdA }] });
    const payload = store.copySelection()!;
    expect(payload.pinPaths.map((p) => p.id)).toEqual([pathIdA, pathIdB]);
    expect(payload.threadPaths.map((t) => t.id)).toEqual([threadPathId]);
  });

  it("copying pins copies their owning Pin Paths", () => {
    const store = new EditorStore();
    const { layerId, pathIdC } = seed(store);
    const pinId = store.getState().pinLayers[0].pinPaths[2].pins[0].id;
    store.select({ type: "pins", refs: [{ layerId, pathId: pathIdC, pinId }] });
    expect(store.copySelection()!.pinPaths.map((p) => p.id)).toEqual([pathIdC]);
  });

  it("copying a thread includes every Pin Path its pins belong to", () => {
    const store = new EditorStore();
    const { pathIdA, pathIdB, threadLayerId, threadPathId } = seed(store);
    store.setMode("thread");
    store.select({ type: "threadPath", layerId: threadLayerId, pathId: threadPathId });
    const payload = store.copySelection()!;
    expect(payload.pinPaths.map((p) => p.id)).toEqual([pathIdA, pathIdB]);
    expect(payload.threadPaths.map((t) => t.id)).toEqual([threadPathId]);
  });

  it("paste appends to the active layers with fresh ids as ONE undo step", () => {
    const store = new EditorStore();
    const { layerId, pathIdA } = seed(store);
    store.setMode("select");
    store.select({ type: "pinPaths", refs: [{ layerId, pathId: pathIdA }] });
    const payload = store.copySelection()!;

    expect(store.pasteClipboard(payload)).toBe(true);
    expect(counts(store)).toEqual({ paths: 5, threads: 2 });
    const s = store.getState();
    const pastedThread = s.threadLayers[0].threadPaths[1];
    const pastedPinIds = new Set(s.pinLayers[0].pinPaths.slice(3).flatMap((p) => p.pins.map((pin) => pin.id)));
    expect(pastedThread.pinIds.every((id) => pastedPinIds.has(id))).toBe(true);

    store.undo();
    expect(counts(store)).toEqual({ paths: 3, threads: 1 });
  });

  it("repeated pastes on the same board cascade the offset", () => {
    const store = new EditorStore();
    const { layerId, pathIdC } = seed(store);
    store.select({ type: "pinPaths", refs: [{ layerId, pathId: pathIdC }] });
    const payload = store.copySelection()!;
    store.pasteClipboard(payload);
    store.pasteClipboard(payload);
    const paths = store.getState().pinLayers[0].pinPaths;
    expect(paths[3].pins[0]).toMatchObject({ x: PASTE_OFFSET, y: 10 + PASTE_OFFSET });
    expect(paths[4].pins[0]).toMatchObject({ x: 2 * PASTE_OFFSET, y: 10 + 2 * PASTE_OFFSET });
  });

  it("selects the pasted Pin Paths in Edit mode", () => {
    const store = new EditorStore();
    const { layerId, pathIdC } = seed(store);
    store.setMode("select");
    store.select({ type: "pinPaths", refs: [{ layerId, pathId: pathIdC }] });
    store.pasteClipboard(store.copySelection()!);
    const pastedId = store.getState().pinLayers[0].pinPaths[3].id;
    expect(store.getState().selection).toEqual({ type: "pinPaths", refs: [{ layerId, pathId: pastedId }] });
  });

  it("selects the pasted thread in Thread mode", () => {
    const store = new EditorStore();
    const { threadLayerId, threadPathId } = seed(store);
    store.setMode("thread");
    store.select({ type: "threadPath", layerId: threadLayerId, pathId: threadPathId });
    store.pasteClipboard(store.copySelection()!);
    const pastedId = store.getState().threadLayers[0].threadPaths[1].id;
    expect(store.getState().selection).toEqual({ type: "threadPath", layerId: threadLayerId, pathId: pastedId });
  });

  it("paste is blocked when the active Pin Layer is locked", () => {
    const store = new EditorStore();
    const { layerId, pathIdC } = seed(store);
    store.select({ type: "pinPaths", refs: [{ layerId, pathId: pathIdC }] });
    const payload = store.copySelection()!;
    store.togglePinLayerLocked(layerId);
    expect(store.pasteClipboard(payload)).toBe(false);
    expect(counts(store).paths).toBe(3);
  });

  it("paste with threads is blocked when the active Thread Layer is locked", () => {
    const store = new EditorStore();
    const { layerId, pathIdA, threadLayerId } = seed(store);
    store.select({ type: "pinPaths", refs: [{ layerId, pathId: pathIdA }] });
    const payload = store.copySelection()!;
    store.toggleThreadLayerLocked(threadLayerId);
    expect(store.pasteClipboard(payload)).toBe(false);
    expect(counts(store)).toEqual({ paths: 3, threads: 1 });
  });

  it("pastes into another board at the original position, with no references back to the source", () => {
    const source = new EditorStore();
    const { layerId, pathIdA } = seed(source);
    source.select({ type: "pinPaths", refs: [{ layerId, pathId: pathIdA }] });
    const payload = JSON.parse(JSON.stringify(source.copySelection()));

    const target = new EditorStore();
    expect(target.pasteClipboard(payload)).toBe(true);
    const s = target.getState();
    expect(s.pinLayers[0].pinPaths).toHaveLength(2);
    expect(s.pinLayers[0].pinPaths[0].pins[0]).toMatchObject({ x: 0, y: 0 });
    const sourceIds = new Set(payload.pinPaths.flatMap((p: { pins: { id: string }[] }) => p.pins.map((pin) => pin.id)));
    expect(s.threadLayers[0].threadPaths[0].pinIds.some((id) => sourceIds.has(id))).toBe(false);
  });

  it("loading a project makes a previous copy count as coming from another board", () => {
    const store = new EditorStore();
    const { layerId, pathIdC } = seed(store);
    store.select({ type: "pinPaths", refs: [{ layerId, pathId: pathIdC }] });
    const payload = store.copySelection()!;
    store.loadProject(store.toProjectFile());
    store.pasteClipboard(payload);
    expect(store.getState().pinLayers[0].pinPaths[3].pins[0]).toMatchObject({ x: 0, y: 10 });
  });
});
