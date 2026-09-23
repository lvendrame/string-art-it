import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EditorStore } from "@application/document";
import { useThreadDrawing } from "./useThreadDrawing";

function setup() {
  const store = new EditorStore();
  const layerId = store.getState().pinLayers[0].id;
  store.addPinPath(layerId, { type: "circle", center: { x: 0, y: 0 }, radius: 5 });
  const pins = store.getState().pinLayers[0].pinPaths[0].pins;
  store.setMode("thread");
  const threadLayerId = store.getState().threadLayers[0].id;
  return { store, pins, threadLayerId };
}

function renderThreadDrawing(store: EditorStore, threadLayerId: string, cursorDoc: { x: number; y: number } | null = null) {
  return renderHook((c: typeof cursorDoc = cursorDoc) => useThreadDrawing(store, store.getState(), threadLayerId, c));
}

describe("useThreadDrawing", () => {
  it("mouse move with the Select tool active clears the candidate pin instead of hit-testing one", () => {
    const { store, threadLayerId } = setup();
    store.setThreadTool("select");
    const { result } = renderThreadDrawing(store, threadLayerId);

    act(() => result.current.handleMouseMove({ x: 0, y: 0 }, 1000));

    expect(result.current.threadCandidateId).toBeNull();
  });

  it("mouse down with the Draw tool far from any pin does nothing", () => {
    const { store, threadLayerId } = setup();
    const { result } = renderThreadDrawing(store, threadLayerId);

    act(() => result.current.handleMouseDown({ x: 9999, y: 9999 }, 1));

    expect(store.getState().threadDraft).toBeNull();
  });

  it("double-click with a tool other than Draw does nothing", () => {
    const { store, pins, threadLayerId } = setup();
    store.setThreadTool("eraser");
    store.extendThreadDraft(pins[0].id);
    const { result } = renderThreadDrawing(store, threadLayerId);

    act(() => result.current.handleDoubleClick({ x: pins[1].x, y: pins[1].y }, 1000));

    expect(store.getState().threadDraft).not.toBeNull();
  });

  it("double-click with Draw active but no pin under the cursor does nothing", () => {
    const { store, pins, threadLayerId } = setup();
    store.extendThreadDraft(pins[0].id);
    const { result } = renderThreadDrawing(store, threadLayerId);

    act(() => result.current.handleDoubleClick({ x: 9999, y: 9999 }, 1));

    expect(store.getState().threadDraft).not.toBeNull();
  });

  it("double-click with Draw active and a pin under the cursor finishes the draft", () => {
    const { store, pins, threadLayerId } = setup();
    store.extendThreadDraft(pins[0].id);
    const { result } = renderThreadDrawing(store, threadLayerId);

    act(() => result.current.handleDoubleClick({ x: pins[1].x, y: pins[1].y }, 1000));

    expect(store.getState().threadDraft).toBeNull();
    expect(store.getState().threadLayers[0].threadPaths).toHaveLength(1);
  });

  it("statusText is null with no draft and no candidate pin", () => {
    const { store, threadLayerId } = setup();
    const { result } = renderThreadDrawing(store, threadLayerId);
    expect(result.current.statusText).toBeNull();
  });

  it("statusText prompts to start a thread once a candidate pin is hovered", () => {
    const { store, pins, threadLayerId } = setup();
    const { result, rerender } = renderThreadDrawing(store, threadLayerId);

    act(() => result.current.handleMouseMove({ x: pins[0].x, y: pins[0].y }, 1000));
    rerender();

    expect(result.current.statusText).toContain("click to start a Thread Path");
  });

  it("statusText prompts to extend once a draft exists but nothing is hovered yet", () => {
    const { store, pins, threadLayerId } = setup();
    store.extendThreadDraft(pins[0].id);
    const { result } = renderThreadDrawing(store, threadLayerId, null);

    expect(result.current.statusText).toContain("click the next pin to extend");
  });

  it("statusText shows the live segment length once a candidate pin is hovered mid-draft", () => {
    const { store, pins, threadLayerId } = setup();
    store.extendThreadDraft(pins[0].id);
    const { result, rerender } = renderThreadDrawing(store, threadLayerId);

    act(() => result.current.handleMouseMove({ x: pins[1].x, y: pins[1].y }, 1000));
    rerender();

    expect(result.current.statusText).toMatch(/Segment: [\d.]+ cm/);
  });

  it("statusText shows the live segment length tracking the raw cursor before a candidate is hit", () => {
    const { store, pins, threadLayerId } = setup();
    store.extendThreadDraft(pins[0].id);
    const { result } = renderThreadDrawing(store, threadLayerId, { x: 3, y: 4 });

    expect(result.current.statusText).toMatch(/From Pin .* → \? \| Segment: [\d.]+ cm/);
  });
});
