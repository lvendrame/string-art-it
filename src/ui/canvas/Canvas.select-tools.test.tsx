import { render, screen, fireEvent } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";
import { EditorStore } from "../../application/document";
import { rotatePoint } from "../../domain/transforms";
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
    store.select({ type: "pinPath", layerId, pathId });
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
});

describe("Canvas — Edit mode: Rotation", () => {
  it("rotates the selected Pin Path about the press point (external pivot), committing on release", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    const pathId = store.addPinPath(layerId, { type: "line", start: { x: 10, y: 10 }, end: { x: 30, y: 10 } })!;
    store.setMode("select");
    store.setSelectTool("rotate");
    store.select({ type: "pinPath", layerId, pathId });

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
});

describe("Canvas — Edit mode: Merge", () => {
  function seedTwoPaths(store: EditorStore) {
    const layerId = store.getState().pinLayers[0].id;
    const pathIdA = store.addPinPath(layerId, { type: "line", start: { x: 10, y: 10 }, end: { x: 12, y: 10 } })!; // pins x=10,11,12 y=10
    const pathIdB = store.addPinPath(layerId, { type: "line", start: { x: 10, y: 20 }, end: { x: 12, y: 20 } })!; // pins x=10,11,12 y=20
    store.setMode("select");
    store.setSelectTool("merge");
    return { layerId, pathIdA, pathIdB };
  }

  it("left-click accumulates pins across two Pin Paths, right-click merges them into one pin in the first-clicked path", () => {
    const store = new EditorStore();
    const { layerId, pathIdA, pathIdB } = seedTwoPaths(store);
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    fireEvent.mouseDown(svg, { clientX: 200, clientY: 200 }); // pinsA[0] at doc(10,10)
    fireEvent.mouseDown(svg, { clientX: 200, clientY: 240 }); // pinsB[0] at doc(10,20)
    fireEvent.contextMenu(svg);

    const pathA = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathIdA)!;
    const pathB = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathIdB)!;
    expect(pathA.pins).toHaveLength(3);
    expect(pathB.pins).toHaveLength(2);
    const mergedPin = pathA.pins.find((p) => p.x === 10 && p.y === 15);
    expect(mergedPin).toBeDefined();
    expect(store.getState().selection).toEqual({ type: "pinPath", layerId, pathId: pathIdA });
    expect(store.getState().mergeSelection).toEqual([]);
  });

  it("right-clicking directly on an already-selected pin still commits (a real right-click also fires mousedown)", () => {
    // Regression test: handlePointerDown must ignore non-primary buttons — otherwise
    // the right-click's own mousedown re-toggles the pin OFF via the merge tool's
    // left-click handler a moment before the contextmenu tries to commit, silently
    // dropping it below the 2-candidate minimum.
    const store = new EditorStore();
    const { pathIdA, pathIdB } = seedTwoPaths(store);
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    fireEvent.mouseDown(svg, { clientX: 200, clientY: 200 }); // pinsA[0] at doc(10,10)
    fireEvent.mouseDown(svg, { clientX: 200, clientY: 240 }); // pinsB[0] at doc(10,20)
    expect(store.getState().mergeSelection).toHaveLength(2);

    // A real right-click on pinsA[0] fires a (button=2) mousedown, then contextmenu.
    fireEvent.mouseDown(svg, { clientX: 200, clientY: 200, button: 2 });
    fireEvent.contextMenu(svg, { clientX: 200, clientY: 200 });

    const pathA = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathIdA)!;
    const pathB = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathIdB)!;
    expect(pathA.pins).toHaveLength(3); // 3 - 1 removed + 1 merged
    expect(pathB.pins).toHaveLength(2); // 3 - 1 removed
    expect(store.getState().mergeSelection).toEqual([]);
  });

  it("Esc cancels a pending merge selection without mutating any pin", () => {
    const store = new EditorStore();
    const { pathIdA } = seedTwoPaths(store);
    const originalPath = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathIdA)!;
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    fireEvent.mouseDown(svg, { clientX: 200, clientY: 200 }); // pinsA[0]
    expect(store.getState().mergeSelection).toHaveLength(1);
    fireEvent.keyDown(window, { key: "Escape" });

    expect(store.getState().mergeSelection).toEqual([]);
    expect(store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathIdA)).toEqual(originalPath);
  });
});
