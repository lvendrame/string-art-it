import { render, screen, fireEvent } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi, afterEach } from "vitest";
import { EditorStore } from "../../application/document";
import { rotatePoint } from "../../domain/transforms";
import { Canvas } from "./Canvas";

beforeAll(() => {
  Element.prototype.getBoundingClientRect = () =>
    ({ left: 0, top: 0, right: 720, bottom: 640, width: 720, height: 640, x: 0, y: 0, toJSON() {} }) as DOMRect;
});

// docs/specs/23-keyboard-transform.md — default viewport is zoom 4 (see EditorStore's
// initial state), so screenDistanceToDocument(1px) = 0.25 doc units, (10px) = 2.5.

describe("Canvas — keyboard transform: Move", () => {
  function setup() {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    const pathId = store.addPinPath(layerId, { type: "line", start: { x: 10, y: 10 }, end: { x: 30, y: 10 } })!;
    const originalPath = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathId)!;
    store.setMode("select");
    store.setSelectTool("move");
    store.select({ type: "pinPaths", refs: [{ layerId, pathId }] });
    return { store, layerId, pathId, originalPath };
  }

  it("ArrowRight nudges by 1 screen-pixel worth of document distance (0.25 at zoom 4), as one undo step", () => {
    const { store, pathId, originalPath } = setup();
    render(<Canvas store={store} />);

    fireEvent.keyDown(window, { key: "ArrowRight" });

    const moved = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathId)!;
    expect(moved.geometry).toEqual({ type: "line", start: { x: 10.25, y: 10 }, end: { x: 30.25, y: 10 } });
    // Pin ids stay stable, same as the mouse Move tool.
    expect(moved.pins.map((p) => p.id)).toEqual(originalPath.pins.map((p) => p.id));

    store.undo();
    expect(store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathId)!).toEqual(originalPath);
  });

  it("Shift+ArrowLeft nudges by 10x (2.5 doc units) in the negative x direction", () => {
    const { store, pathId } = setup();
    render(<Canvas store={store} />);

    fireEvent.keyDown(window, { key: "ArrowLeft", shiftKey: true });

    const moved = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathId)!;
    expect(moved.geometry).toEqual({ type: "line", start: { x: 7.5, y: 10 }, end: { x: 27.5, y: 10 } });
  });

  it("Shift+ArrowDown nudges by 10x in the positive y direction", () => {
    const { store, pathId } = setup();
    render(<Canvas store={store} />);

    fireEvent.keyDown(window, { key: "ArrowDown", shiftKey: true });

    const moved = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathId)!;
    expect(moved.geometry).toEqual({ type: "line", start: { x: 10, y: 12.5 }, end: { x: 30, y: 12.5 } });
  });

  it("does nothing when no Pin Path is selected", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    store.addPinPath(layerId, { type: "line", start: { x: 10, y: 10 }, end: { x: 30, y: 10 } });
    store.setMode("select");
    store.setSelectTool("move");
    store.select({ type: "none" });
    const before = store.getState().pinLayers[0].pinPaths[0];
    render(<Canvas store={store} />);

    fireEvent.keyDown(window, { key: "ArrowRight" });

    expect(store.getState().pinLayers[0].pinPaths[0]).toEqual(before);
  });

  it("does nothing while Select tool (not Move) is active", () => {
    const { store, pathId, originalPath } = setup();
    store.setSelectTool("select");
    render(<Canvas store={store} />);

    fireEvent.keyDown(window, { key: "ArrowRight" });

    expect(store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathId)!).toEqual(originalPath);
  });

  it("does nothing while focus is in a text input (native input stepping isn't hijacked)", () => {
    const { store, pathId, originalPath } = setup();
    render(
      <>
        <Canvas store={store} />
        <input aria-label="spacing" />
      </>,
    );
    const input = screen.getByLabelText("spacing");

    fireEvent.keyDown(input, { key: "ArrowRight" });

    expect(store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathId)!).toEqual(originalPath);
  });

  it("ignores OS key-repeat auto-fire", () => {
    const { store, pathId, originalPath } = setup();
    render(<Canvas store={store} />);

    fireEvent.keyDown(window, { key: "ArrowRight", repeat: true });

    expect(store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathId)!).toEqual(originalPath);
  });

  it("is blocked on a locked layer", () => {
    const { store, layerId, pathId, originalPath } = setup();
    store.togglePinLayerLocked(layerId);
    render(<Canvas store={store} />);

    fireEvent.keyDown(window, { key: "ArrowRight" });

    expect(store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathId)!).toEqual(originalPath);
  });
});

describe("Canvas — keyboard transform: Rotate", () => {
  function setup() {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    const pathId = store.addPinPath(layerId, { type: "line", start: { x: 10, y: 10 }, end: { x: 30, y: 10 } })!;
    store.setMode("select");
    store.setSelectTool("rotate");
    store.select({ type: "pinPaths", refs: [{ layerId, pathId }] });
    return { store, pathId };
  }

  const centroid = { x: 20, y: 10 };

  it("ArrowUp rotates 1° anticlockwise about the shape's own centroid", () => {
    const { store, pathId } = setup();
    render(<Canvas store={store} />);

    fireEvent.keyDown(window, { key: "ArrowUp" });

    const theta = (-1 * Math.PI) / 180;
    const expectedStart = rotatePoint({ x: 10, y: 10 }, centroid, theta);
    const expectedEnd = rotatePoint({ x: 30, y: 10 }, centroid, theta);
    const result = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathId)!.geometry;
    if (result.type !== "line") throw new Error("expected line");
    expect(result.start.x).toBeCloseTo(expectedStart.x, 6);
    expect(result.start.y).toBeCloseTo(expectedStart.y, 6);
    expect(result.end.x).toBeCloseTo(expectedEnd.x, 6);
    expect(result.end.y).toBeCloseTo(expectedEnd.y, 6);
  });

  it("Left also rotates anticlockwise; Down/Right rotate clockwise; Shift gives a 10° step", () => {
    const { store, pathId } = setup();
    render(<Canvas store={store} />);

    fireEvent.keyDown(window, { key: "ArrowLeft" });
    let result = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathId)!.geometry;
    if (result.type !== "line") throw new Error("expected line");
    let expectedStart = rotatePoint({ x: 10, y: 10 }, centroid, (-1 * Math.PI) / 180);
    expect(result.start.x).toBeCloseTo(expectedStart.x, 6);

    fireEvent.keyDown(window, { key: "ArrowRight", shiftKey: true });
    result = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathId)!.geometry;
    if (result.type !== "line") throw new Error("expected line");
    // Cumulative: -1deg then +10deg = +9deg net, from the ORIGINAL geometry's centroid.
    expectedStart = rotatePoint({ x: 10, y: 10 }, centroid, (9 * Math.PI) / 180);
    expect(result.start.x).toBeCloseTo(expectedStart.x, 6);
    expect(result.start.y).toBeCloseTo(expectedStart.y, 6);
  });

  it("does not change the pin count (rotation never triggers redistribution)", () => {
    const { store, pathId } = setup();
    const before = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathId)!.pins.length;
    render(<Canvas store={store} />);

    fireEvent.keyDown(window, { key: "ArrowUp" });

    const after = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathId)!.pins.length;
    expect(after).toBe(before);
  });
});

describe("Canvas — keyboard transform: Scale", () => {
  function setup() {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    const pathId = store.addPinPath(layerId, { type: "circle", center: { x: 0, y: 0 }, radius: 4 })!;
    store.setMode("select");
    store.setSelectTool("scale");
    store.select({ type: "pinPaths", refs: [{ layerId, pathId }] });
    return { store, layerId, pathId };
  }

  it("ArrowUp increases radius by 1%, keeping the centre fixed and recalculating pins", () => {
    const { store, pathId } = setup();
    const before = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathId)!;
    render(<Canvas store={store} />);

    fireEvent.keyDown(window, { key: "ArrowUp" });

    const after = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathId)!;
    if (after.geometry.type !== "circle") throw new Error("expected circle");
    expect(after.geometry.radius).toBeCloseTo(4.04, 6);
    expect(after.geometry.center).toEqual({ x: 0, y: 0 });
    expect(after.pins.map((p) => p.id)).not.toEqual(before.pins.map((p) => p.id));

    store.undo();
    expect(store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathId)!).toEqual(before);
  });

  it("ArrowDown decreases by 1%; Shift+ArrowRight increases by 10%; Down/Left decrease", () => {
    const { store, pathId } = setup();
    render(<Canvas store={store} />);

    fireEvent.keyDown(window, { key: "ArrowDown" });
    let after = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathId)!;
    if (after.geometry.type !== "circle") throw new Error("expected circle");
    expect(after.geometry.radius).toBeCloseTo(3.96, 6);

    fireEvent.keyDown(window, { key: "ArrowRight", shiftKey: true });
    after = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathId)!;
    if (after.geometry.type !== "circle") throw new Error("expected circle");
    expect(after.geometry.radius).toBeCloseTo(3.96 * 1.1, 6);
  });

  it("reattaches a connected Thread Path to the nearest new pin, as one undo step", () => {
    const { store, pathId } = setup();
    const originalPath = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathId)!;
    const threadLayerId = store.getState().threadLayers[0].id;
    store.extendThreadDraft(originalPath.pins[0].id);
    store.finishThreadDraftWithSegment(threadLayerId, originalPath.pins[1].id);
    render(<Canvas store={store} />);

    fireEvent.keyDown(window, { key: "ArrowUp" });

    const scaled = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathId)!;
    const thread = store.getState().threadLayers[0].threadPaths[0];
    expect(thread.pinIds.every((id) => scaled.pins.some((p) => p.id === id))).toBe(true);

    store.undo();
    expect(store.getState().threadLayers[0].threadPaths[0].pinIds).toEqual([originalPath.pins[0].id, originalPath.pins[1].id]);
  });

  it("is blocked on a locked layer", () => {
    const { store, layerId, pathId } = setup();
    const before = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathId)!;
    store.togglePinLayerLocked(layerId);
    render(<Canvas store={store} />);

    fireEvent.keyDown(window, { key: "ArrowUp" });

    expect(store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathId)!).toEqual(before);
  });
});

describe("Canvas — keyboard transform: hold-to-repeat", () => {
  function setup() {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    const pathId = store.addPinPath(layerId, { type: "line", start: { x: 10, y: 10 }, end: { x: 30, y: 10 } })!;
    store.setMode("select");
    store.setSelectTool("move");
    store.select({ type: "pinPaths", refs: [{ layerId, pathId }] });
    return { store, pathId };
  }

  function startX(store: EditorStore, pathId: string): number {
    const geometry = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathId)!.geometry;
    if (geometry.type !== "line") throw new Error("expected line");
    return geometry.start.x;
  }

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not repeat before the 500ms initial delay elapses", () => {
    vi.useFakeTimers();
    const { store, pathId } = setup();
    render(<Canvas store={store} />);

    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(startX(store, pathId)).toBe(10.25); // one immediate press

    vi.advanceTimersByTime(499);
    expect(startX(store, pathId)).toBe(10.25); // still just the one press
  });

  it("repeats every 100ms once the 500ms delay has elapsed, until released", () => {
    vi.useFakeTimers();
    const { store, pathId } = setup();
    render(<Canvas store={store} />);

    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(startX(store, pathId)).toBe(10.25); // press 1 (immediate)

    vi.advanceTimersByTime(500); // delay elapses, interval armed but hasn't ticked yet
    expect(startX(store, pathId)).toBe(10.25);

    vi.advanceTimersByTime(100); // first repeat tick
    expect(startX(store, pathId)).toBe(10.5);

    vi.advanceTimersByTime(100); // second repeat tick
    expect(startX(store, pathId)).toBe(10.75);

    fireEvent.keyUp(window, { key: "ArrowRight" });
    vi.advanceTimersByTime(500); // released — no further ticks
    expect(startX(store, pathId)).toBe(10.75);
  });

  it("stops repeating (without erroring) if the layer becomes locked mid-hold", () => {
    vi.useFakeTimers();
    const { store, pathId } = setup();
    const layerId = store.getState().pinLayers[0].id;
    render(<Canvas store={store} />);

    fireEvent.keyDown(window, { key: "ArrowRight" });
    vi.advanceTimersByTime(500);
    vi.advanceTimersByTime(100);
    const xAfterOneTick = startX(store, pathId);

    store.togglePinLayerLocked(layerId);
    vi.advanceTimersByTime(300); // would be 3 more ticks if still unlocked

    expect(startX(store, pathId)).toBe(xAfterOneTick);
  });

  it("switching keys mid-hold restarts the repeat timer for the new key", () => {
    vi.useFakeTimers();
    const { store, pathId } = setup();
    render(<Canvas store={store} />);

    fireEvent.keyDown(window, { key: "ArrowRight" });
    vi.advanceTimersByTime(300); // well before the 500ms delay
    fireEvent.keyDown(window, { key: "ArrowLeft" }); // new key takes over
    expect(startX(store, pathId)).toBeCloseTo(10.25 - 0.25, 6); // net: +1 press right, +1 press left

    vi.advanceTimersByTime(500);
    vi.advanceTimersByTime(100);
    // Only ArrowLeft should now be auto-repeating.
    expect(startX(store, pathId)).toBeCloseTo(10.25 - 0.25 - 0.25, 6);
  });
});
