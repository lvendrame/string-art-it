import { render, screen, fireEvent } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";
import { EditorStore } from "@application/document";
import { rotatePoint } from "@domain/transforms";
import { Canvas } from "./Canvas";

beforeAll(() => {
  Element.prototype.getBoundingClientRect = () =>
    ({ left: 0, top: 0, right: 720, bottom: 640, width: 720, height: 640, x: 0, y: 0, toJSON() {} }) as DOMRect;
});

// zoom 4, panOrigin (-40,-40): screen(200,200)->doc(10,10), screen(280,200)->doc(30,10)

describe("Canvas — Edit mode: Move", () => {
  function setup() {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    const pathId = store.addPinPath(layerId, { type: "line", start: { x: 10, y: 10 }, end: { x: 30, y: 10 } })!;
    const pins = store.getState().pinLayers[0].pinPaths[0].pins;
    const threadLayerId = store.getState().threadLayers[0].id;
    store.extendThreadDraft(pins[0].id);
    store.finishThreadDraftWithSegment(threadLayerId, pins[5].id);
    store.setMode("select");
    store.setSelectTool("move");
    store.select({ type: "pinPaths", refs: [{ layerId, pathId }] });
    return { store, layerId, pathId, pins };
  }

  it("drags the selected Pin Path live, and a connected thread follows (same pin objects)", () => {
    const { store, pins } = setup();
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    fireEvent.mouseDown(svg, { clientX: 240, clientY: 200 }); // doc(20,10)
    fireEvent.mouseMove(svg, { clientX: 280, clientY: 200 }); // doc(30,10) -> delta (10,0)

    const livePins = store.getState().pinLayers[0].pinPaths[0].pins;
    expect(livePins[0]).toMatchObject({ id: pins[0].id, x: 20, y: 10 });
    // The thread references the same pin id — its live-rendered position follows.
    expect(store.getState().threadLayers[0].threadPaths[0].pinIds).toContain(pins[0].id);
  });

  it("commits the translation once on release, as one undo step, and keeps the connected thread intact", () => {
    const { store, pathId, pins } = setup();
    const originalPath = store.getState().pinLayers[0].pinPaths[0];
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    fireEvent.mouseDown(svg, { clientX: 240, clientY: 200 }); // doc(20,10)
    fireEvent.mouseMove(svg, { clientX: 280, clientY: 200 }); // doc(30,10)
    fireEvent.mouseUp(svg, { clientX: 280, clientY: 200 }); // delta (10,0)

    const moved = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathId)!;
    expect(moved.geometry).toEqual({ type: "line", start: { x: 20, y: 10 }, end: { x: 40, y: 10 } });
    // Pin ids stay stable across the commit — a connected Thread Path must not orphan.
    expect(moved.pins.map((p) => p.id)).toEqual(originalPath.pins.map((p) => p.id));
    expect(moved.pins[0]).toMatchObject({ x: 20, y: 10 });
    expect(store.getState().threadLayers[0].threadPaths[0].pinIds).toEqual([pins[0].id, pins[5].id]);

    store.undo();
    expect(store.getState().pinLayers[0].pinPaths[0]).toEqual(originalPath);
  });

  it("Esc aborts an in-progress Move, leaving the original pins untouched and nothing committed", () => {
    const { store, pathId } = setup();
    const originalPath = store.getState().pinLayers[0].pinPaths[0];
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    fireEvent.mouseDown(svg, { clientX: 240, clientY: 200 });
    fireEvent.mouseMove(svg, { clientX: 280, clientY: 200 }); // pins now translated in live preview
    fireEvent.keyDown(window, { key: "Escape" });

    expect(store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathId)).toEqual(originalPath);
  });

  it("with a Pins-granularity selection, drags only the selected pin within its path live and commits on release", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    const pathId = store.addPinPath(layerId, { type: "line", start: { x: 10, y: 10 }, end: { x: 30, y: 10 } })!;
    const pins = store.getState().pinLayers[0].pinPaths[0].pins;
    store.setMode("select");
    store.setSelectTool("move");
    store.setSelectGranularity("pins");
    store.select({ type: "pins", refs: [{ layerId, pathId, pinId: pins[0].id }] });
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    fireEvent.mouseDown(svg, { clientX: 240, clientY: 200 }); // doc(20,10)
    fireEvent.mouseMove(svg, { clientX: 280, clientY: 200 }); // delta (10,0)

    const livePins = store.getState().pinLayers[0].pinPaths[0].pins;
    expect(livePins[0]).toMatchObject({ id: pins[0].id, x: 20, y: 10 });
    expect(livePins[1]).toMatchObject({ id: pins[1].id, x: pins[1].x, y: pins[1].y }); // untouched sibling pin

    fireEvent.mouseUp(svg, { clientX: 280, clientY: 200 });

    const committed = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathId)!;
    expect(committed.pins[0]).toMatchObject({ x: 20, y: 10 });
    expect(committed.pins[1]).toMatchObject({ x: pins[1].x, y: pins[1].y });

    store.undo();
    expect(store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathId)!.pins[0]).toMatchObject({ x: pins[0].x, y: pins[0].y });
  });

  it("a non-Escape key during an in-progress Move drag does nothing", () => {
    const { store, pathId } = setup();
    const originalPath = store.getState().pinLayers[0].pinPaths[0];
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    fireEvent.mouseDown(svg, { clientX: 240, clientY: 200 });
    fireEvent.mouseMove(svg, { clientX: 280, clientY: 200 });
    fireEvent.keyDown(window, { key: "a" });

    const livePins = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathId)!.pins;
    expect(livePins[0]).not.toEqual(originalPath.pins[0]); // drag preview is still live, untouched by the stray key
  });

  it("with a Pin-Paths selection ref to a path that no longer exists, Move press is a no-op", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    store.addPinPath(layerId, { type: "line", start: { x: 10, y: 10 }, end: { x: 30, y: 10 } });
    store.setMode("select");
    store.setSelectTool("move");
    store.select({ type: "pinPaths", refs: [{ layerId, pathId: "missing-path" }] });
    const before = store.getState().pinLayers[0].pinPaths[0];
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    fireEvent.mouseDown(svg, { clientX: 240, clientY: 200 });
    fireEvent.mouseMove(svg, { clientX: 280, clientY: 200 });
    fireEvent.mouseUp(svg, { clientX: 280, clientY: 200 });

    expect(store.getState().pinLayers[0].pinPaths[0]).toEqual(before);
  });

  it("with an empty Pins-granularity selection, Move press is a no-op", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    store.addPinPath(layerId, { type: "line", start: { x: 10, y: 10 }, end: { x: 30, y: 10 } });
    store.setMode("select");
    store.setSelectTool("move");
    store.setSelectGranularity("pins");
    store.select({ type: "pins", refs: [] });
    const before = store.getState().pinLayers[0].pinPaths[0];
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    fireEvent.mouseDown(svg, { clientX: 240, clientY: 200 });
    fireEvent.mouseMove(svg, { clientX: 280, clientY: 200 });
    fireEvent.mouseUp(svg, { clientX: 280, clientY: 200 });

    expect(store.getState().pinLayers[0].pinPaths[0]).toEqual(before);
  });

  it("with a Pins-granularity selection where the owning path no longer exists, Move press is a no-op", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    store.addPinPath(layerId, { type: "line", start: { x: 10, y: 10 }, end: { x: 30, y: 10 } });
    store.setMode("select");
    store.setSelectTool("move");
    store.setSelectGranularity("pins");
    store.select({ type: "pins", refs: [{ layerId, pathId: "missing-path", pinId: "missing-pin" }] });
    const before = store.getState().pinLayers[0].pinPaths[0];
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    fireEvent.mouseDown(svg, { clientX: 240, clientY: 200 });
    fireEvent.mouseMove(svg, { clientX: 280, clientY: 200 });
    fireEvent.mouseUp(svg, { clientX: 280, clientY: 200 });

    expect(store.getState().pinLayers[0].pinPaths[0]).toEqual(before);
  });
});

describe("Canvas — Edit mode: Rotation", () => {
  it("rotates the selected Pin Path about the press point (external pivot), committing on release", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    const pathId = store.addPinPath(layerId, { type: "line", start: { x: 10, y: 10 }, end: { x: 30, y: 10 } })!;
    store.setMode("select");
    store.setSelectTool("rotate");
    store.select({ type: "pinPaths", refs: [{ layerId, pathId }] });

    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    // Pivot at doc(0,0) -> screen(160,160). Drag 300px right -> 300 * 0.3deg/px = 90deg.
    fireEvent.mouseDown(svg, { clientX: 160, clientY: 160 });
    fireEvent.mouseMove(svg, { clientX: 460, clientY: 160 });
    fireEvent.mouseUp(svg, { clientX: 460, clientY: 160 });

    const expectedStart = rotatePoint({ x: 10, y: 10 }, { x: 0, y: 0 }, Math.PI / 2);
    const expectedEnd = rotatePoint({ x: 30, y: 10 }, { x: 0, y: 0 }, Math.PI / 2);
    const result = store.getState().pinLayers[0].pinPaths[0].geometry;
    if (result.type !== "line") throw new Error("expected line");
    expect(result.start.x).toBeCloseTo(expectedStart.x, 3);
    expect(result.start.y).toBeCloseTo(expectedStart.y, 3);
    expect(result.end.x).toBeCloseTo(expectedEnd.x, 3);
    expect(result.end.y).toBeCloseTo(expectedEnd.y, 3);
  });

  it("Esc aborts an in-progress Rotation, leaving the original pins untouched and nothing committed", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    const pathId = store.addPinPath(layerId, { type: "line", start: { x: 10, y: 10 }, end: { x: 30, y: 10 } })!;
    const originalPath = store.getState().pinLayers[0].pinPaths[0];
    store.setMode("select");
    store.setSelectTool("rotate");
    store.select({ type: "pinPaths", refs: [{ layerId, pathId }] });
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    fireEvent.mouseDown(svg, { clientX: 160, clientY: 160 });
    fireEvent.mouseMove(svg, { clientX: 460, clientY: 160 });
    fireEvent.keyDown(window, { key: "Escape" });

    expect(store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathId)).toEqual(originalPath);
  });

  it("with a Pin-Paths selection ref to a path that no longer exists, Rotation press is a no-op", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    store.addPinPath(layerId, { type: "line", start: { x: 10, y: 10 }, end: { x: 30, y: 10 } });
    store.setMode("select");
    store.setSelectTool("rotate");
    store.select({ type: "pinPaths", refs: [{ layerId, pathId: "missing-path" }] });
    const before = store.getState().pinLayers[0].pinPaths[0];
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    fireEvent.mouseDown(svg, { clientX: 160, clientY: 160 });
    fireEvent.mouseMove(svg, { clientX: 460, clientY: 160 });
    fireEvent.mouseUp(svg, { clientX: 460, clientY: 160 });

    expect(store.getState().pinLayers[0].pinPaths[0]).toEqual(before);
  });

  it("with a Pins-granularity selection, rotates only the selected pin about the press point and commits on release", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    const pathId = store.addPinPath(layerId, { type: "line", start: { x: 10, y: 10 }, end: { x: 30, y: 10 } })!;
    const pins = store.getState().pinLayers[0].pinPaths[0].pins;
    store.setMode("select");
    store.setSelectTool("rotate");
    store.setSelectGranularity("pins");
    store.select({ type: "pins", refs: [{ layerId, pathId, pinId: pins[0].id }] });
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    fireEvent.mouseDown(svg, { clientX: 160, clientY: 160 });
    fireEvent.mouseMove(svg, { clientX: 460, clientY: 160 });

    const livePins = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathId)!.pins;
    const expected = rotatePoint(pins[0], { x: 0, y: 0 }, Math.PI / 2);
    expect(livePins[0].x).toBeCloseTo(expected.x, 3);
    expect(livePins[0].y).toBeCloseTo(expected.y, 3);
    expect(livePins[1]).toMatchObject({ x: pins[1].x, y: pins[1].y }); // untouched sibling pin

    fireEvent.mouseUp(svg, { clientX: 460, clientY: 160 });

    const committed = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathId)!;
    expect(committed.pins[0].x).toBeCloseTo(expected.x, 3);
    expect(committed.pins[1]).toMatchObject({ x: pins[1].x, y: pins[1].y });

    store.undo();
    expect(store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathId)!.pins[0]).toMatchObject({ x: pins[0].x, y: pins[0].y });
  });

  it("with an empty Pins-granularity selection, Rotation press is a no-op", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    store.addPinPath(layerId, { type: "line", start: { x: 10, y: 10 }, end: { x: 30, y: 10 } });
    store.setMode("select");
    store.setSelectTool("rotate");
    store.setSelectGranularity("pins");
    store.select({ type: "pins", refs: [] });
    const before = store.getState().pinLayers[0].pinPaths[0];
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    fireEvent.mouseDown(svg, { clientX: 160, clientY: 160 });
    fireEvent.mouseMove(svg, { clientX: 460, clientY: 160 });
    fireEvent.mouseUp(svg, { clientX: 460, clientY: 160 });

    expect(store.getState().pinLayers[0].pinPaths[0]).toEqual(before);
  });
});

describe("Canvas — Edit mode: Scale", () => {
  function setup() {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    const pathId = store.addPinPath(layerId, { type: "circle", center: { x: 0, y: 0 }, radius: 4 })!;
    store.setMode("select");
    store.setSelectTool("scale");
    store.select({ type: "pinPaths", refs: [{ layerId, pathId }] });
    return { store, layerId, pathId };
  }

  it("scales the selected Pin Path live about its own centroid, committing on release", () => {
    const { store, pathId } = setup();
    const before = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathId)!;
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    // Doubling the radius: factor 2 needs deltaPx = (2-1)/0.004 = 250px.
    fireEvent.mouseDown(svg, { clientX: 160, clientY: 160 });
    fireEvent.mouseMove(svg, { clientX: 410, clientY: 160 });

    const livePins = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathId)!.pins;
    expect(livePins.map((p) => p.id)).not.toEqual(before.pins.map((p) => p.id)); // live preview recomputes pins

    fireEvent.mouseUp(svg, { clientX: 410, clientY: 160 });

    const after = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathId)!;
    if (after.geometry.type !== "circle") throw new Error("expected circle");
    expect(after.geometry.radius).toBeCloseTo(8, 6);
    expect(after.geometry.center).toEqual({ x: 0, y: 0 });

    store.undo();
    expect(store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathId)!).toEqual(before);
  });

  it("Esc aborts an in-progress Scale, leaving the original pins untouched and nothing committed", () => {
    const { store, pathId } = setup();
    const before = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathId)!;
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    fireEvent.mouseDown(svg, { clientX: 160, clientY: 160 });
    fireEvent.mouseMove(svg, { clientX: 410, clientY: 160 });
    fireEvent.keyDown(window, { key: "Escape" });

    expect(store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathId)).toEqual(before);
  });

  it("with a Pin-Paths selection ref to a path that no longer exists, Scale press is a no-op", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    store.addPinPath(layerId, { type: "circle", center: { x: 0, y: 0 }, radius: 4 });
    store.setMode("select");
    store.setSelectTool("scale");
    store.select({ type: "pinPaths", refs: [{ layerId, pathId: "missing-path" }] });
    const before = store.getState().pinLayers[0].pinPaths[0];
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    fireEvent.mouseDown(svg, { clientX: 160, clientY: 160 });
    fireEvent.mouseMove(svg, { clientX: 410, clientY: 160 });
    fireEvent.mouseUp(svg, { clientX: 410, clientY: 160 });

    expect(store.getState().pinLayers[0].pinPaths[0]).toEqual(before);
  });

  it("a non-Escape key during an in-progress Scale drag does nothing", () => {
    const { store, pathId } = setup();
    const before = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathId)!;
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    fireEvent.mouseDown(svg, { clientX: 160, clientY: 160 });
    fireEvent.mouseMove(svg, { clientX: 410, clientY: 160 });
    fireEvent.keyDown(window, { key: "a" });

    const livePins = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathId)!.pins;
    expect(livePins.map((p) => p.id)).not.toEqual(before.pins.map((p) => p.id)); // drag preview is still live, untouched by the stray key
  });

  it("with a Pins-granularity selection where the owning path no longer exists, Scale press is a no-op", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    store.addPinPath(layerId, { type: "line", start: { x: 10, y: 10 }, end: { x: 30, y: 10 } });
    store.setMode("select");
    store.setSelectTool("scale");
    store.setSelectGranularity("pins");
    store.select({ type: "pins", refs: [{ layerId, pathId: "missing-path", pinId: "missing-pin" }] });
    const before = store.getState().pinLayers[0].pinPaths[0];
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    fireEvent.mouseDown(svg, { clientX: 160, clientY: 160 });
    fireEvent.mouseMove(svg, { clientX: 410, clientY: 160 });
    fireEvent.mouseUp(svg, { clientX: 410, clientY: 160 });

    expect(store.getState().pinLayers[0].pinPaths[0]).toEqual(before);
  });

  it("with a Pins-granularity selection, scales only the selected pin about the selection's own centroid and commits on release", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    const pathId = store.addPinPath(layerId, { type: "line", start: { x: 10, y: 10 }, end: { x: 30, y: 10 } })!;
    const pins = store.getState().pinLayers[0].pinPaths[0].pins;
    store.setMode("select");
    store.setSelectTool("scale");
    store.setSelectGranularity("pins");
    store.select({ type: "pins", refs: [{ layerId, pathId, pinId: pins[0].id }] });
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    fireEvent.mouseDown(svg, { clientX: 160, clientY: 160 });
    fireEvent.mouseMove(svg, { clientX: 410, clientY: 160 });

    const livePins = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathId)!.pins;
    expect(livePins[1]).toMatchObject({ x: pins[1].x, y: pins[1].y }); // untouched sibling pin

    fireEvent.mouseUp(svg, { clientX: 410, clientY: 160 });

    const committed = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathId)!;
    expect(committed.pins[1]).toMatchObject({ x: pins[1].x, y: pins[1].y });

    store.undo();
    expect(store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathId)!.pins[0]).toMatchObject({ x: pins[0].x, y: pins[0].y });
  });

  it("with an empty Pins-granularity selection, Scale press is a no-op", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    store.addPinPath(layerId, { type: "line", start: { x: 10, y: 10 }, end: { x: 30, y: 10 } });
    store.setMode("select");
    store.setSelectTool("scale");
    store.setSelectGranularity("pins");
    store.select({ type: "pins", refs: [] });
    const before = store.getState().pinLayers[0].pinPaths[0];
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    fireEvent.mouseDown(svg, { clientX: 160, clientY: 160 });
    fireEvent.mouseMove(svg, { clientX: 410, clientY: 160 });
    fireEvent.mouseUp(svg, { clientX: 410, clientY: 160 });

    expect(store.getState().pinLayers[0].pinPaths[0]).toEqual(before);
  });
});

// docs/specs/26-edit-mode-multi-select.md — Merge dropped its own canvas pointer
// gesture entirely; it's now an instant action fired against whatever the Select
// tool's multi-selection holds (EditorStore.merge.test.ts covers the algorithm).
// These tests instead cover the Select tool's own new gestures: click (replace),
// Alt/Cmd-click (toggle), rubber-band drag (replace with touched set), Alt/Cmd-drag
// (union), and Esc-cancels-a-drag.
describe("Canvas — Select tool: multi-select gestures (Pin Path granularity)", () => {
  function seedTwoPaths(store: EditorStore) {
    const layerId = store.getState().pinLayers[0].id;
    const pathIdA = store.addPinPath(layerId, { type: "line", start: { x: 10, y: 10 }, end: { x: 12, y: 10 } })!; // pins x=10,11,12 y=10
    const pathIdB = store.addPinPath(layerId, { type: "line", start: { x: 10, y: 20 }, end: { x: 12, y: 20 } })!; // pins x=10,11,12 y=20
    store.setMode("select");
    store.setSelectTool("select");
    return { layerId, pathIdA, pathIdB };
  }

  it("click selects a single Pin Path, replacing any previous selection", () => {
    const store = new EditorStore();
    const { layerId, pathIdA, pathIdB } = seedTwoPaths(store);
    store.select({ type: "pinPaths", refs: [{ layerId, pathId: pathIdB }] });
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    fireEvent.mouseDown(svg, { clientX: 200, clientY: 200 }); // pinsA[0] at doc(10,10)
    fireEvent.mouseUp(svg, { clientX: 200, clientY: 200 });

    expect(store.getState().selection).toEqual({ type: "pinPaths", refs: [{ layerId, pathId: pathIdA }] });
  });

  it("clicking empty canvas clears the selection", () => {
    const store = new EditorStore();
    const { layerId, pathIdA } = seedTwoPaths(store);
    store.select({ type: "pinPaths", refs: [{ layerId, pathId: pathIdA }] });
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    fireEvent.mouseDown(svg, { clientX: 600, clientY: 600 });
    fireEvent.mouseUp(svg, { clientX: 600, clientY: 600 });

    expect(store.getState().selection).toEqual({ type: "none" });
  });

  it("Alt-click adds an unselected path to the selection without clearing the rest", () => {
    const store = new EditorStore();
    const { layerId, pathIdA, pathIdB } = seedTwoPaths(store);
    store.select({ type: "pinPaths", refs: [{ layerId, pathId: pathIdA }] });
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    fireEvent.mouseDown(svg, { clientX: 200, clientY: 240, altKey: true }); // pinsB[0] at doc(10,20)
    fireEvent.mouseUp(svg, { clientX: 200, clientY: 240, altKey: true });

    const sel = store.getState().selection;
    if (sel.type !== "pinPaths") throw new Error("expected pinPaths selection");
    expect(sel.refs).toHaveLength(2);
    expect(sel.refs.map((r) => r.pathId).sort()).toEqual([pathIdA, pathIdB].sort());
  });

  it("Alt-click on an already-selected path removes it from the selection", () => {
    const store = new EditorStore();
    const { layerId, pathIdA, pathIdB } = seedTwoPaths(store);
    store.select({ type: "pinPaths", refs: [{ layerId, pathId: pathIdA }, { layerId, pathId: pathIdB }] });
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    fireEvent.mouseDown(svg, { clientX: 200, clientY: 200, altKey: true }); // pinsA[0]
    fireEvent.mouseUp(svg, { clientX: 200, clientY: 200, altKey: true });

    expect(store.getState().selection).toEqual({ type: "pinPaths", refs: [{ layerId, pathId: pathIdB }] });
  });

  it("Alt-click on empty space is a no-op, leaving the selection untouched", () => {
    const store = new EditorStore();
    const { layerId, pathIdA } = seedTwoPaths(store);
    store.select({ type: "pinPaths", refs: [{ layerId, pathId: pathIdA }] });
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    fireEvent.mouseDown(svg, { clientX: 600, clientY: 600, altKey: true });
    fireEvent.mouseUp(svg, { clientX: 600, clientY: 600, altKey: true });

    expect(store.getState().selection).toEqual({ type: "pinPaths", refs: [{ layerId, pathId: pathIdA }] });
  });

  it("a rubber-band drag selects every Pin Path touched by the rectangle, replacing the selection", () => {
    const store = new EditorStore();
    const { pathIdA, pathIdB } = seedTwoPaths(store);
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    // rect doc(5,5)->(15,25): screen (180,180)->(220,260), covers both paths' pins
    fireEvent.mouseDown(svg, { clientX: 180, clientY: 180 });
    fireEvent.mouseMove(svg, { clientX: 220, clientY: 260 });
    fireEvent.mouseUp(svg, { clientX: 220, clientY: 260 });

    const sel = store.getState().selection;
    if (sel.type !== "pinPaths") throw new Error("expected pinPaths selection");
    expect(sel.refs.map((r) => r.pathId).sort()).toEqual([pathIdA, pathIdB].sort());
  });

  it("an Alt-rubber-band drag unions the touched set into the existing selection", () => {
    const store = new EditorStore();
    const { layerId, pathIdA, pathIdB } = seedTwoPaths(store);
    store.select({ type: "pinPaths", refs: [{ layerId, pathId: pathIdA }] });
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    // rect touching only pathB: doc(5,15)->(15,25) -> screen(180,220)->(220,260)
    fireEvent.mouseDown(svg, { clientX: 180, clientY: 220, altKey: true });
    fireEvent.mouseMove(svg, { clientX: 220, clientY: 260, altKey: true });
    fireEvent.mouseUp(svg, { clientX: 220, clientY: 260, altKey: true });

    const sel = store.getState().selection;
    if (sel.type !== "pinPaths") throw new Error("expected pinPaths selection");
    expect(sel.refs.map((r) => r.pathId).sort()).toEqual([pathIdA, pathIdB].sort());
  });

  it("Esc cancels an in-progress rubber-band drag, leaving the selection unchanged", () => {
    const store = new EditorStore();
    const { layerId, pathIdA } = seedTwoPaths(store);
    store.select({ type: "pinPaths", refs: [{ layerId, pathId: pathIdA }] });
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    fireEvent.mouseDown(svg, { clientX: 180, clientY: 180 });
    fireEvent.mouseMove(svg, { clientX: 220, clientY: 260 });
    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.mouseUp(svg, { clientX: 220, clientY: 260 });

    expect(store.getState().selection).toEqual({ type: "pinPaths", refs: [{ layerId, pathId: pathIdA }] });
  });

  it("a non-Escape key during an in-progress rubber-band drag does nothing", () => {
    const store = new EditorStore();
    const { layerId, pathIdA } = seedTwoPaths(store);
    store.select({ type: "pinPaths", refs: [{ layerId, pathId: pathIdA }] });
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    fireEvent.mouseDown(svg, { clientX: 180, clientY: 180 });
    fireEvent.mouseMove(svg, { clientX: 220, clientY: 260 });
    fireEvent.keyDown(window, { key: "a" });
    fireEvent.mouseUp(svg, { clientX: 220, clientY: 260 });

    const sel = store.getState().selection;
    if (sel.type !== "pinPaths") throw new Error("expected pinPaths selection");
    expect(sel.refs.length).toBeGreaterThan(0); // drag was not cancelled by the stray key, so it still committed
  });

  it("a mouse move with no press in progress does nothing", () => {
    const store = new EditorStore();
    seedTwoPaths(store);
    store.select({ type: "none" });
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    expect(() => fireEvent.mouseMove(svg, { clientX: 220, clientY: 260 })).not.toThrow();
    expect(store.getState().selection).toEqual({ type: "none" });
  });

  it("Alt-click when nothing is selected yet just adds the clicked path", () => {
    const store = new EditorStore();
    const { layerId, pathIdA } = seedTwoPaths(store);
    store.select({ type: "none" });
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    fireEvent.mouseDown(svg, { clientX: 200, clientY: 200, altKey: true }); // pinsA[0]
    fireEvent.mouseUp(svg, { clientX: 200, clientY: 200, altKey: true });

    expect(store.getState().selection).toEqual({ type: "pinPaths", refs: [{ layerId, pathId: pathIdA }] });
  });

  it("Alt-click removing the only selected path clears the selection", () => {
    const store = new EditorStore();
    const { layerId, pathIdA } = seedTwoPaths(store);
    store.select({ type: "pinPaths", refs: [{ layerId, pathId: pathIdA }] });
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    fireEvent.mouseDown(svg, { clientX: 200, clientY: 200, altKey: true }); // pinsA[0]
    fireEvent.mouseUp(svg, { clientX: 200, clientY: 200, altKey: true });

    expect(store.getState().selection).toEqual({ type: "none" });
  });

  it("a rubber-band drag touching nothing clears the selection", () => {
    const store = new EditorStore();
    const { layerId, pathIdA } = seedTwoPaths(store);
    store.select({ type: "pinPaths", refs: [{ layerId, pathId: pathIdA }] });
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    fireEvent.mouseDown(svg, { clientX: 600, clientY: 600 });
    fireEvent.mouseMove(svg, { clientX: 650, clientY: 650 });
    fireEvent.mouseUp(svg, { clientX: 650, clientY: 650 });

    expect(store.getState().selection).toEqual({ type: "none" });
  });

  it("an Alt-rubber-band drag with nothing pre-selected and nothing touched leaves the selection empty", () => {
    const store = new EditorStore();
    seedTwoPaths(store);
    store.select({ type: "none" });
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    fireEvent.mouseDown(svg, { clientX: 600, clientY: 600, altKey: true });
    fireEvent.mouseMove(svg, { clientX: 650, clientY: 650, altKey: true });
    fireEvent.mouseUp(svg, { clientX: 650, clientY: 650, altKey: true });

    expect(store.getState().selection).toEqual({ type: "none" });
  });

  it("an Alt-rubber-band drag re-touching an already-selected path doesn't duplicate it", () => {
    const store = new EditorStore();
    const { layerId, pathIdA } = seedTwoPaths(store);
    store.select({ type: "pinPaths", refs: [{ layerId, pathId: pathIdA }] });
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    // rect doc(5,5)->(15,15): screen(180,180)->(220,220), touches only pathA (already selected)
    fireEvent.mouseDown(svg, { clientX: 180, clientY: 180, altKey: true });
    fireEvent.mouseMove(svg, { clientX: 220, clientY: 220, altKey: true });
    fireEvent.mouseUp(svg, { clientX: 220, clientY: 220, altKey: true });

    expect(store.getState().selection).toEqual({ type: "pinPaths", refs: [{ layerId, pathId: pathIdA }] });
  });
});

describe("Canvas — Select tool: multi-select gestures (Pins granularity)", () => {
  function seedTwoPaths(store: EditorStore) {
    const layerId = store.getState().pinLayers[0].id;
    const pathIdA = store.addPinPath(layerId, { type: "line", start: { x: 10, y: 10 }, end: { x: 12, y: 10 } })!; // pins x=10,11,12 y=10
    const pathIdB = store.addPinPath(layerId, { type: "line", start: { x: 10, y: 20 }, end: { x: 12, y: 20 } })!; // pins x=10,11,12 y=20
    const pinsA = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathIdA)!.pins;
    const pinsB = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathIdB)!.pins;
    store.setMode("select");
    store.setSelectTool("select");
    store.setSelectGranularity("pins");
    return { layerId, pathIdA, pathIdB, pinsA, pinsB };
  }

  it("click selects a single pin, replacing any previous selection", () => {
    const store = new EditorStore();
    const { layerId, pathIdA, pathIdB, pinsA, pinsB } = seedTwoPaths(store);
    store.select({ type: "pins", refs: [{ layerId, pathId: pathIdB, pinId: pinsB[0].id }] });
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    fireEvent.mouseDown(svg, { clientX: 200, clientY: 200 }); // pinsA[0] at doc(10,10)
    fireEvent.mouseUp(svg, { clientX: 200, clientY: 200 });

    expect(store.getState().selection).toEqual({ type: "pins", refs: [{ layerId, pathId: pathIdA, pinId: pinsA[0].id }] });
  });

  it("clicking empty canvas clears the selection", () => {
    const store = new EditorStore();
    const { layerId, pathIdA, pinsA } = seedTwoPaths(store);
    store.select({ type: "pins", refs: [{ layerId, pathId: pathIdA, pinId: pinsA[0].id }] });
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    fireEvent.mouseDown(svg, { clientX: 600, clientY: 600 });
    fireEvent.mouseUp(svg, { clientX: 600, clientY: 600 });

    expect(store.getState().selection).toEqual({ type: "none" });
  });

  it("Alt-click adds an unselected pin to the selection without clearing the rest", () => {
    const store = new EditorStore();
    const { layerId, pathIdA, pinsA, pinsB } = seedTwoPaths(store);
    store.select({ type: "pins", refs: [{ layerId, pathId: pathIdA, pinId: pinsA[0].id }] });
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    fireEvent.mouseDown(svg, { clientX: 200, clientY: 240, altKey: true }); // pinsB[0] at doc(10,20)
    fireEvent.mouseUp(svg, { clientX: 200, clientY: 240, altKey: true });

    const sel = store.getState().selection;
    if (sel.type !== "pins") throw new Error("expected pins selection");
    expect(sel.refs).toHaveLength(2);
    expect(sel.refs.map((r) => r.pinId).sort()).toEqual([pinsA[0].id, pinsB[0].id].sort());
  });

  it("Alt-click on an already-selected pin removes it from the selection", () => {
    const store = new EditorStore();
    const { layerId, pathIdA, pathIdB, pinsA, pinsB } = seedTwoPaths(store);
    store.select({
      type: "pins",
      refs: [
        { layerId, pathId: pathIdA, pinId: pinsA[0].id },
        { layerId, pathId: pathIdB, pinId: pinsB[0].id },
      ],
    });
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    fireEvent.mouseDown(svg, { clientX: 200, clientY: 200, altKey: true }); // pinsA[0]
    fireEvent.mouseUp(svg, { clientX: 200, clientY: 200, altKey: true });

    expect(store.getState().selection).toEqual({ type: "pins", refs: [{ layerId, pathId: pathIdB, pinId: pinsB[0].id }] });
  });

  it("Alt-click on empty space is a no-op, leaving the selection untouched", () => {
    const store = new EditorStore();
    const { layerId, pathIdA, pinsA } = seedTwoPaths(store);
    store.select({ type: "pins", refs: [{ layerId, pathId: pathIdA, pinId: pinsA[0].id }] });
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    fireEvent.mouseDown(svg, { clientX: 600, clientY: 600, altKey: true });
    fireEvent.mouseUp(svg, { clientX: 600, clientY: 600, altKey: true });

    expect(store.getState().selection).toEqual({ type: "pins", refs: [{ layerId, pathId: pathIdA, pinId: pinsA[0].id }] });
  });

  it("a rubber-band drag selects every pin touched by the rectangle, replacing the selection", () => {
    const store = new EditorStore();
    const { pinsA, pinsB } = seedTwoPaths(store);
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    // rect doc(5,5)->(15,25): screen (180,180)->(220,260), covers both paths' pins
    fireEvent.mouseDown(svg, { clientX: 180, clientY: 180 });
    fireEvent.mouseMove(svg, { clientX: 220, clientY: 260 });
    fireEvent.mouseUp(svg, { clientX: 220, clientY: 260 });

    const sel = store.getState().selection;
    if (sel.type !== "pins") throw new Error("expected pins selection");
    const expectedIds = [...pinsA, ...pinsB].map((p) => p.id).sort();
    expect(sel.refs.map((r) => r.pinId).sort()).toEqual(expectedIds);
  });

  it("an Alt-rubber-band drag unions the touched set into the existing selection", () => {
    const store = new EditorStore();
    const { layerId, pathIdA, pinsA, pinsB } = seedTwoPaths(store);
    store.select({ type: "pins", refs: [{ layerId, pathId: pathIdA, pinId: pinsA[0].id }] });
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    // rect touching only pathB: doc(5,15)->(15,25) -> screen(180,220)->(220,260)
    fireEvent.mouseDown(svg, { clientX: 180, clientY: 220, altKey: true });
    fireEvent.mouseMove(svg, { clientX: 220, clientY: 260, altKey: true });
    fireEvent.mouseUp(svg, { clientX: 220, clientY: 260, altKey: true });

    const sel = store.getState().selection;
    if (sel.type !== "pins") throw new Error("expected pins selection");
    const expectedIds = [pinsA[0].id, ...pinsB.map((p) => p.id)].sort();
    expect(sel.refs.map((r) => r.pinId).sort()).toEqual(expectedIds);
  });

  it("a rubber-band drag touching nothing clears the selection", () => {
    const store = new EditorStore();
    const { layerId, pathIdA, pinsA } = seedTwoPaths(store);
    store.select({ type: "pins", refs: [{ layerId, pathId: pathIdA, pinId: pinsA[0].id }] });
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    fireEvent.mouseDown(svg, { clientX: 600, clientY: 600 });
    fireEvent.mouseMove(svg, { clientX: 650, clientY: 650 });
    fireEvent.mouseUp(svg, { clientX: 650, clientY: 650 });

    expect(store.getState().selection).toEqual({ type: "none" });
  });

  it("an Alt-rubber-band drag touching nothing leaves the selection unchanged", () => {
    const store = new EditorStore();
    const { layerId, pathIdA, pinsA } = seedTwoPaths(store);
    store.select({ type: "pins", refs: [{ layerId, pathId: pathIdA, pinId: pinsA[0].id }] });
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    fireEvent.mouseDown(svg, { clientX: 600, clientY: 600, altKey: true });
    fireEvent.mouseMove(svg, { clientX: 650, clientY: 650, altKey: true });
    fireEvent.mouseUp(svg, { clientX: 650, clientY: 650, altKey: true });

    expect(store.getState().selection).toEqual({ type: "pins", refs: [{ layerId, pathId: pathIdA, pinId: pinsA[0].id }] });
  });

  it("Alt-click when nothing is selected yet just adds the clicked pin", () => {
    const store = new EditorStore();
    const { layerId, pathIdA, pinsA } = seedTwoPaths(store);
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    fireEvent.mouseDown(svg, { clientX: 200, clientY: 200, altKey: true }); // pinsA[0]
    fireEvent.mouseUp(svg, { clientX: 200, clientY: 200, altKey: true });

    expect(store.getState().selection).toEqual({ type: "pins", refs: [{ layerId, pathId: pathIdA, pinId: pinsA[0].id }] });
  });

  it("Alt-click removing the only selected pin clears the selection", () => {
    const store = new EditorStore();
    const { layerId, pathIdA, pinsA } = seedTwoPaths(store);
    store.select({ type: "pins", refs: [{ layerId, pathId: pathIdA, pinId: pinsA[0].id }] });
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    fireEvent.mouseDown(svg, { clientX: 200, clientY: 200, altKey: true }); // pinsA[0]
    fireEvent.mouseUp(svg, { clientX: 200, clientY: 200, altKey: true });

    expect(store.getState().selection).toEqual({ type: "none" });
  });

  it("an Alt-rubber-band drag with nothing pre-selected and nothing touched leaves the selection empty", () => {
    const store = new EditorStore();
    seedTwoPaths(store);
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    fireEvent.mouseDown(svg, { clientX: 600, clientY: 600, altKey: true });
    fireEvent.mouseMove(svg, { clientX: 650, clientY: 650, altKey: true });
    fireEvent.mouseUp(svg, { clientX: 650, clientY: 650, altKey: true });

    expect(store.getState().selection).toEqual({ type: "none" });
  });

  it("an Alt-rubber-band drag re-touching an already-selected pin doesn't duplicate it", () => {
    const store = new EditorStore();
    const { layerId, pathIdA, pinsA } = seedTwoPaths(store);
    store.select({ type: "pins", refs: [{ layerId, pathId: pathIdA, pinId: pinsA[0].id }] });
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    // rect doc(9,9)->(10.5,10.5): screen(196,196)->(202,202), touches only pinsA[0] (already selected)
    fireEvent.mouseDown(svg, { clientX: 196, clientY: 196, altKey: true });
    fireEvent.mouseMove(svg, { clientX: 202, clientY: 202, altKey: true });
    fireEvent.mouseUp(svg, { clientX: 202, clientY: 202, altKey: true });

    expect(store.getState().selection).toEqual({ type: "pins", refs: [{ layerId, pathId: pathIdA, pinId: pinsA[0].id }] });
  });
});
