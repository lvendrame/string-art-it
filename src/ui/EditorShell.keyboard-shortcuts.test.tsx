import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EditorStore } from "@application/document";
import { EditorShell } from "./EditorShell";
import { fitViewportForBoard } from "./canvas/boardViewport";

describe("EditorShell keyboard shortcuts — global", () => {
  it("does not intercept a shortcut while a text field has focus", () => {
    const store = new EditorStore();
    render(<EditorShell store={store} onNewProject={() => {}} />);
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    fireEvent.keyDown(input, { key: "g", ctrlKey: true, shiftKey: true });

    expect(store.getState().grid.visible).toBe(true); // unchanged (default)
    document.body.removeChild(input);
  });

  it("Ctrl+Shift+G toggles grid visibility", () => {
    const store = new EditorStore();
    const before = store.getState().grid.visible;
    render(<EditorShell store={store} onNewProject={() => {}} />);

    fireEvent.keyDown(window, { key: "g", ctrlKey: true, shiftKey: true });

    expect(store.getState().grid.visible).toBe(!before);
  });

  it("Ctrl+Shift+A toggles snap", () => {
    const store = new EditorStore();
    const before = store.getState().grid.snapEnabled;
    render(<EditorShell store={store} onNewProject={() => {}} />);

    fireEvent.keyDown(window, { key: "a", ctrlKey: true, shiftKey: true });

    expect(store.getState().grid.snapEnabled).toBe(!before);
  });

  it("bare '+' zooms in", () => {
    const store = new EditorStore();
    const before = store.getState().viewport.zoom;
    render(<EditorShell store={store} onNewProject={() => {}} />);

    fireEvent.keyDown(window, { key: "+" });

    expect(store.getState().viewport.zoom).toBeGreaterThan(before);
  });

  it("bare '-' zooms out", () => {
    const store = new EditorStore();
    const before = store.getState().viewport.zoom;
    render(<EditorShell store={store} onNewProject={() => {}} />);

    fireEvent.keyDown(window, { key: "-" });

    expect(store.getState().viewport.zoom).toBeLessThan(before);
  });

  it("bare '0' fits the viewport back to the board-fit zoom", () => {
    const store = new EditorStore();
    const fitZoom = fitViewportForBoard(store.getState().board).zoom;
    store.setViewport({ ...store.getState().viewport, zoom: fitZoom * 3 });
    render(<EditorShell store={store} onNewProject={() => {}} />);

    fireEvent.keyDown(window, { key: "0" });

    expect(store.getState().viewport.zoom).toBe(fitZoom);
  });

  it("digits 1-6 switch tabs", () => {
    const store = new EditorStore();
    render(<EditorShell store={store} onNewProject={() => {}} />);
    const order = ["select", "pin", "thread", "generate", "pan", "play"] as const;

    order.forEach((mode, i) => {
      fireEvent.keyDown(window, { key: String(i + 1) });
      expect(store.getState().mode).toBe(mode);
    });
  });

  it("'?' opens the Help overlay", () => {
    const store = new EditorStore();
    render(<EditorShell store={store} onNewProject={() => {}} />);

    fireEvent.keyDown(window, { key: "?" });

    expect(screen.getByRole("tablist", { name: "Help topics" })).toBeInTheDocument();
  });

  it("Ctrl+Alt+N starts a new project and calls onNewProject", () => {
    const store = new EditorStore();
    store.setBoardDimensions({ diameter: 90 });
    const onNewProject = vi.fn();
    render(<EditorShell store={store} onNewProject={onNewProject} />);

    fireEvent.keyDown(window, { key: "n", ctrlKey: true, altKey: true });

    expect(onNewProject).toHaveBeenCalledTimes(1);
    expect(store.getState().board.dimensions.diameter).not.toBe(90);
  });

  it("Ctrl+S saves the project (triggers a Blob download)", () => {
    const store = new EditorStore();
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const createObjectURLSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock");
    render(<EditorShell store={store} onNewProject={() => {}} />);

    fireEvent.keyDown(window, { key: "s", ctrlKey: true });

    expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it("Ctrl+O opens the file picker", () => {
    const store = new EditorStore();
    render(<EditorShell store={store} onNewProject={() => {}} />);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(fileInput, "click");

    fireEvent.keyDown(window, { key: "o", ctrlKey: true });

    expect(clickSpy).toHaveBeenCalledTimes(1);
  });
});

describe("EditorShell keyboard shortcuts — Edit tab", () => {
  it("letters select Edit-tab tools only while in Edit mode", () => {
    const store = new EditorStore();
    store.setMode("select");
    render(<EditorShell store={store} onNewProject={() => {}} />);

    fireEvent.keyDown(window, { key: "m" });
    expect(store.getState().selectTool).toBe("move");
    fireEvent.keyDown(window, { key: "r" });
    expect(store.getState().selectTool).toBe("rotate");
    fireEvent.keyDown(window, { key: "c" });
    expect(store.getState().selectTool).toBe("scale");
    fireEvent.keyDown(window, { key: "s" });
    expect(store.getState().selectTool).toBe("select");
  });

  it("Shift+P toggles selection granularity", () => {
    const store = new EditorStore();
    store.setMode("select");
    render(<EditorShell store={store} onNewProject={() => {}} />);

    fireEvent.keyDown(window, { key: "p", shiftKey: true });
    expect(store.getState().selectGranularity).toBe("pins");
    fireEvent.keyDown(window, { key: "p", shiftKey: true });
    expect(store.getState().selectGranularity).toBe("path");
  });

  it("J merges 2+ selected Pin Paths but no-ops below 2", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    const pathIdA = store.addPinPath(layerId, { type: "line", start: { x: 10, y: 10 }, end: { x: 12, y: 10 } })!;
    const pathIdB = store.addPinPath(layerId, { type: "line", start: { x: 10, y: 20 }, end: { x: 12, y: 20 } })!;
    store.setMode("select");
    store.select({ type: "pinPaths", refs: [{ layerId, pathId: pathIdA }] });
    render(<EditorShell store={store} onNewProject={() => {}} />);

    fireEvent.keyDown(window, { key: "j" });
    expect(store.getState().pinLayers[0].pinPaths).toHaveLength(2); // no-op, only 1 selected

    store.select({ type: "pinPaths", refs: [{ layerId, pathId: pathIdA }, { layerId, pathId: pathIdB }] });
    fireEvent.keyDown(window, { key: "j" });
    expect(store.getState().pinLayers[0].pinPaths).toHaveLength(1); // merged
  });

  it("Pin-tab letters do nothing while in Edit mode", () => {
    const store = new EditorStore();
    store.setMode("select");
    render(<EditorShell store={store} onNewProject={() => {}} />);

    fireEvent.keyDown(window, { key: "l" }); // Pin tab's "Line" tool letter

    expect(store.getState().pinTool).toBe("circle"); // unchanged
  });
});

describe("EditorShell keyboard shortcuts — Pin tab", () => {
  it("letters select Pin-tab tools", () => {
    const store = new EditorStore();
    store.setMode("pin");
    render(<EditorShell store={store} onNewProject={() => {}} />);

    const cases: [string, string][] = [
      ["l", "line"],
      ["a", "arc"],
      ["e", "ellipse"],
      ["c", "circle"],
      ["r", "rectangle"],
      ["s", "square"],
      ["f", "freehand"],
      ["p", "polygon"],
      ["t", "text"],
      ["d", "eraser"],
      ["q", "path-eraser"],
    ];
    for (const [key, tool] of cases) {
      fireEvent.keyDown(window, { key });
      expect(store.getState().pinTool).toBe(tool);
    }
  });

  it("Shift+S cycles symmetry and wraps around", () => {
    const store = new EditorStore();
    store.setMode("pin");
    render(<EditorShell store={store} onNewProject={() => {}} />);

    const order = ["horizontal", "vertical", "both", "radial", "none"];
    for (const expected of order) {
      fireEvent.keyDown(window, { key: "s", shiftKey: true });
      expect(store.getState().symmetryDefaults.type).toBe(expected);
    }
  });
});

describe("EditorShell keyboard shortcuts — Thread tab", () => {
  it("letters select Thread-tab tools", () => {
    const store = new EditorStore();
    store.setMode("thread");
    render(<EditorShell store={store} onNewProject={() => {}} />);

    fireEvent.keyDown(window, { key: "s" });
    expect(store.getState().threadTool).toBe("select");
    fireEvent.keyDown(window, { key: "e" });
    expect(store.getState().threadTool).toBe("eraser");
    fireEvent.keyDown(window, { key: "c" });
    expect(store.getState().threadTool).toBe("segment-eraser");
    fireEvent.keyDown(window, { key: "d" });
    expect(store.getState().threadTool).toBe("draw");
  });

  it("Shift+1/2/3 sets colour count (real keyboards send the shifted symbol as `key`, e.g. Shift+2 -> \"@\" — detection must use `code`)", () => {
    const store = new EditorStore();
    store.setMode("thread");
    render(<EditorShell store={store} onNewProject={() => {}} />);

    fireEvent.keyDown(window, { key: "@", code: "Digit2", shiftKey: true });
    expect(store.getState().threadDefaults.colours).toHaveLength(2);
    fireEvent.keyDown(window, { key: "#", code: "Digit3", shiftKey: true });
    expect(store.getState().threadDefaults.colours).toHaveLength(3);
    fireEvent.keyDown(window, { key: "!", code: "Digit1", shiftKey: true });
    expect(store.getState().threadDefaults.colours).toHaveLength(1);
  });

  it("Shift++ / Shift+- adjust width, clamped 0.5-5", () => {
    const store = new EditorStore();
    store.setMode("thread");
    render(<EditorShell store={store} onNewProject={() => {}} />);
    const before = store.getState().threadDefaults.width;

    fireEvent.keyDown(window, { key: "+", shiftKey: true });
    expect(store.getState().threadDefaults.width).toBe(before + 0.5);
    fireEvent.keyDown(window, { key: "-", shiftKey: true });
    expect(store.getState().threadDefaults.width).toBe(before);
  });

  it("unshifted '=' still zooms while in Thread mode", () => {
    const store = new EditorStore();
    store.setMode("thread");
    const beforeZoom = store.getState().viewport.zoom;
    const beforeWidth = store.getState().threadDefaults.width;
    render(<EditorShell store={store} onNewProject={() => {}} />);

    fireEvent.keyDown(window, { key: "=" });

    expect(store.getState().viewport.zoom).toBeGreaterThan(beforeZoom);
    expect(store.getState().threadDefaults.width).toBe(beforeWidth);
  });
});

describe("EditorShell keyboard shortcuts — Play tab", () => {
  function storeWithOneThreadSegment(): EditorStore {
    const store = new EditorStore();
    const pinLayerId = store.getState().pinLayers[0].id;
    const pathId = store.addPinPath(pinLayerId, { type: "line", start: { x: 10, y: 10 }, end: { x: 30, y: 10 } })!;
    const path = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathId)!;
    store.setMode("thread");
    const threadLayerId = store.getState().threadLayers[0].id;
    store.extendThreadDraft(path.pins[0].id);
    store.extendThreadDraft(path.pins[1].id);
    store.finishThreadDraft(threadLayerId);
    return store;
  }

  it("F/N/L step the transport when frames exist", () => {
    const store = storeWithOneThreadSegment();
    store.setMode("play");
    render(<EditorShell store={store} onNewProject={() => {}} />);

    fireEvent.keyDown(window, { key: "n" });
    expect(screen.getByLabelText("Frame")).toHaveValue(1);
    fireEvent.keyDown(window, { key: "f" });
    expect(screen.getByLabelText("Frame")).toHaveValue(0);
    fireEvent.keyDown(window, { key: "l" });
    expect(screen.getByLabelText("Frame")).toHaveValue(1);
  });

  it("Space toggles play/pause", () => {
    const store = storeWithOneThreadSegment();
    store.setMode("play");
    render(<EditorShell store={store} onNewProject={() => {}} />);

    fireEvent.keyDown(window, { key: " " });
    expect(screen.getByRole("button", { name: /Pause/ })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: " " });
    expect(screen.getByRole("button", { name: /Play/ })).toBeInTheDocument();
  });

  it("keys no-op while the transport is disabled (zero frames)", () => {
    const store = new EditorStore();
    store.setMode("play");
    render(<EditorShell store={store} onNewProject={() => {}} />);

    fireEvent.keyDown(window, { key: "n" });

    expect(screen.getByLabelText("Frame")).toHaveValue(0);
  });
});

describe("EditorShell keyboard shortcuts — arrow-key pan fallback", () => {
  it("arrows pan the viewport in Pin mode (no draft, no arrow-consuming tool)", () => {
    const store = new EditorStore();
    store.setMode("pin");
    const before = store.getState().viewport.panOrigin;
    render(<EditorShell store={store} onNewProject={() => {}} />);

    // Content follows the arrow, matching the app's own drag-to-pan convention
    // (usePanInteraction.ts): pressing Right moves the board right, so panOrigin.x
    // (the SVG viewBox's origin) decreases.
    fireEvent.keyDown(window, { key: "ArrowRight" });
    const afterRight = store.getState().viewport.panOrigin;
    expect(afterRight.x).toBeLessThan(before.x);
    expect(afterRight.y).toBe(before.y);

    fireEvent.keyDown(window, { key: "ArrowDown" });
    const afterDown = store.getState().viewport.panOrigin;
    expect(afterDown.y).toBeLessThan(afterRight.y);
  });

  it("Shift+Arrow pans by a bigger step", () => {
    const store = new EditorStore();
    store.setMode("pin");
    const before = store.getState().viewport.panOrigin;
    render(<EditorShell store={store} onNewProject={() => {}} />);

    fireEvent.keyDown(window, { key: "ArrowRight", shiftKey: true });
    const bigDelta = Math.abs(store.getState().viewport.panOrigin.x - before.x);

    store.setViewport({ ...store.getState().viewport, panOrigin: before });
    fireEvent.keyDown(window, { key: "ArrowRight" });
    const smallDelta = Math.abs(store.getState().viewport.panOrigin.x - before.x);

    expect(bigDelta).toBeGreaterThan(smallDelta);
  });

  it("does not pan when Move tool is active in Edit mode (arrows are claimed for nudging)", () => {
    const store = new EditorStore();
    store.setMode("select");
    store.setSelectTool("move");
    const before = store.getState().viewport.panOrigin;
    render(<EditorShell store={store} onNewProject={() => {}} />);

    fireEvent.keyDown(window, { key: "ArrowRight" });

    expect(store.getState().viewport.panOrigin).toEqual(before);
  });

  it("does not pan ArrowLeft/ArrowRight during an in-progress Thread draft, but ArrowUp/Down still pan", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    const pathId = store.addPinPath(layerId, { type: "line", start: { x: 10, y: 10 }, end: { x: 30, y: 10 } })!;
    const path = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathId)!;
    store.setMode("thread");
    store.extendThreadDraft(path.pins[0].id);
    const before = store.getState().viewport.panOrigin;
    render(<EditorShell store={store} onNewProject={() => {}} />);

    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(store.getState().viewport.panOrigin).toEqual(before); // claimed by the draft (pattern-follow), not pan
    expect(store.getState().threadDraft?.pinIds).toEqual([path.pins[0].id]); // pattern-follow no-ops below 4 vertices

    fireEvent.keyDown(window, { key: "ArrowDown" });
    expect(store.getState().viewport.panOrigin.y).toBeLessThan(before.y); // Up/Down aren't claimed by the thread draft
  });

  it("does not pan ArrowLeft during an in-progress Path (polygon) draft, but ArrowRight still pans", () => {
    const store = new EditorStore();
    store.setMode("pin");
    store.setPinTool("polygon");
    store.extendPolygonDraft({ x: 0, y: 0 });
    store.extendPolygonDraft({ x: 5, y: 0 });
    const before = store.getState().viewport.panOrigin;
    render(<EditorShell store={store} onNewProject={() => {}} />);

    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(store.getState().viewport.panOrigin).toEqual(before); // claimed by the draft (retract)
    expect(store.getState().polygonDraft?.points).toHaveLength(1);

    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(store.getState().viewport.panOrigin.x).toBeLessThan(before.x); // Right isn't claimed by the polygon draft
  });

  it("Ctrl/Alt+Arrow are left alone (no pan)", () => {
    const store = new EditorStore();
    store.setMode("pin");
    const before = store.getState().viewport.panOrigin;
    render(<EditorShell store={store} onNewProject={() => {}} />);

    fireEvent.keyDown(window, { key: "ArrowRight", ctrlKey: true });
    fireEvent.keyDown(window, { key: "ArrowLeft", altKey: true });

    expect(store.getState().viewport.panOrigin).toEqual(before);
  });
});
