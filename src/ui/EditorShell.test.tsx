import { act, render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EditorStore } from "../application/document";
import { EditorShell } from "./EditorShell";

describe("EditorShell undo/redo shortcuts", () => {
  it("Ctrl/Cmd+Z undoes the last board dimension change", () => {
    const store = new EditorStore();
    const before = store.getState().board.dimensions.diameter;
    store.setBoardDimensions({ diameter: 90 });
    render(<EditorShell store={store} onNewProject={() => {}} />);

    fireEvent.keyDown(window, { key: "z", ctrlKey: true });

    expect(store.getState().board.dimensions.diameter).toBe(before);
  });

  it("Ctrl/Cmd+Shift+Z redoes it", () => {
    const store = new EditorStore();
    store.setBoardDimensions({ diameter: 90 });
    store.undo();
    render(<EditorShell store={store} onNewProject={() => {}} />);

    fireEvent.keyDown(window, { key: "z", ctrlKey: true, shiftKey: true });

    expect(store.getState().board.dimensions.diameter).toBe(90);
  });

  it("does not intercept the shortcut while a text field has focus", () => {
    const store = new EditorStore();
    store.setBoardDimensions({ diameter: 90 });
    render(<EditorShell store={store} onNewProject={() => {}} />);
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    fireEvent.keyDown(input, { key: "z", ctrlKey: true });

    expect(store.getState().board.dimensions.diameter).toBe(90); // unchanged
    document.body.removeChild(input);
  });

  it("Ctrl/Cmd+Z retracts the last vertex of an in-progress Thread Path draft instead of undoing history", () => {
    const store = new EditorStore();
    store.setBoardDimensions({ diameter: 90 }); // a committed, undoable step
    store.setMode("thread");
    const [pinLayer] = store.getState().pinLayers;
    store.addPinPath(pinLayer.id, { type: "circle", center: { x: 0, y: 0 }, radius: 7 });
    const path = store.getState().pinLayers[0].pinPaths[0];
    store.extendThreadDraft(path.pins[0].id);
    store.extendThreadDraft(path.pins[1].id);
    render(<EditorShell store={store} onNewProject={() => {}} />);

    fireEvent.keyDown(window, { key: "z", ctrlKey: true });

    expect(store.getState().threadDraft?.pinIds).toEqual([path.pins[0].id]);
    expect(store.getState().board.dimensions.diameter).toBe(90); // history untouched
  });

  it("Undo/Redo toolbar buttons reflect and drive history state", () => {
    const store = new EditorStore();
    render(<EditorShell store={store} onNewProject={() => {}} />);
    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();

    act(() => store.setBoardDimensions({ diameter: 90 }));
    expect(screen.getByRole("button", { name: "Undo" })).not.toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(store.getState().board.dimensions.diameter).not.toBe(90);
  });
});

describe("EditorShell radial context menu", () => {
  // docs/specs/25-radial-context-menu.md — right-click is wired here (not in
  // Canvas.tsx) since it must cover both the interactive Canvas and PlaybackCanvas.
  // zoom 4, panOrigin (-40,-40): screen(200,200)->doc(10,10), screen(200,240)->doc(10,20).

  it("right-click opens the menu; the Merge slice merges the selected Pin Paths", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    const pathIdA = store.addPinPath(layerId, { type: "line", start: { x: 10, y: 10 }, end: { x: 12, y: 10 } })!;
    const pathIdB = store.addPinPath(layerId, { type: "line", start: { x: 10, y: 20 }, end: { x: 12, y: 20 } })!;
    store.setMode("select");
    store.select({ type: "pinPaths", refs: [{ layerId, pathId: pathIdA }, { layerId, pathId: pathIdB }] });
    const { container } = render(<EditorShell store={store} onNewProject={() => {}} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    fireEvent.contextMenu(svg);
    const mergeSlice = container.querySelector('[data-tooltip-content="Merge"]');
    expect(mergeSlice).not.toBeNull();
    fireEvent.click(mergeSlice!);

    // docs/specs/26-edit-mode-multi-select.md — path-mode Merge combines every
    // selected path's pins into one resulting path (3 + 3 pins pooled, none coincide).
    const remaining = store.getState().pinLayers[0].pinPaths;
    expect(remaining).toHaveLength(1);
    expect(remaining[0].pins).toHaveLength(6);
  });

  it("does not show the Merge slice (or merge anything) below 2 selected Pin Paths", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    const pathId = store.addPinPath(layerId, { type: "line", start: { x: 10, y: 10 }, end: { x: 12, y: 10 } })!;
    store.setMode("select");
    store.select({ type: "pinPaths", refs: [{ layerId, pathId }] });
    const { container } = render(<EditorShell store={store} onNewProject={() => {}} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    fireEvent.contextMenu(svg);

    expect(container.querySelector('[data-tooltip-content="Merge"]')).toBeNull();
    expect(store.getState().pinLayers[0].pinPaths).toHaveLength(1); // untouched
  });

  it("right-click during a thread draft; Cut finishes it without adding a pending segment", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    store.addPinPath(layerId, { type: "line", start: { x: 10, y: 10 }, end: { x: 30, y: 10 } });
    store.setMode("thread");
    const { container } = render(<EditorShell store={store} onNewProject={() => {}} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    fireEvent.mouseDown(svg, { clientX: 200, clientY: 200 }); // pin at doc(10,10) — origin only
    fireEvent.mouseDown(svg, { clientX: 240, clientY: 200 }); // pin at doc(20,10) — first segment confirmed
    expect(store.getState().threadDraft?.pinIds).toHaveLength(2);

    fireEvent.contextMenu(svg);
    const cutSlice = container.querySelector('[data-tooltip-content="Cut"]');
    expect(cutSlice).not.toBeNull();
    fireEvent.click(cutSlice!);

    expect(store.getState().threadDraft).toBeNull();
    const threads = store.getState().threadLayers[0].threadPaths;
    expect(threads).toHaveLength(1);
    expect(threads[0].pinIds).toHaveLength(2); // no extra segment added by Cut
  });

  it("Escape closes the menu without firing an action", () => {
    const store = new EditorStore();
    store.setMode("pan");
    const { container } = render(<EditorShell store={store} onNewProject={() => {}} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    fireEvent.contextMenu(svg);
    expect(container.querySelector('[data-tooltip-content="Fit"]')).not.toBeNull();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(container.querySelector('[data-tooltip-content="Fit"]')).toBeNull();
  });
});

describe("EditorShell Help overlay", () => {
  it("Help button opens the Help overlay", () => {
    const store = new EditorStore();
    render(<EditorShell store={store} onNewProject={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: "Help" }));

    expect(screen.getByRole("tablist", { name: "Help topics" })).toBeInTheDocument();
  });
});
