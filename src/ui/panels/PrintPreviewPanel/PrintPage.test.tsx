import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { boardPath, EditorStore, paperDimensionsCm } from "@application/document";
import { pathBoundingBoxPoints } from "@domain/paths";
import { boundingBoxOf } from "@domain/transforms";
import { PrintPage } from "./PrintPage";

describe("PrintPage", () => {
  it("renders a page svg sized to the paper", () => {
    const store = new EditorStore();
    const state = store.getState();
    const path = boardPath(state.board);
    const box = boundingBoxOf(pathBoundingBoxPoints(path));
    const paperSize = paperDimensionsCm(state.printSettings.paper);

    const { container } = render(<PrintPage state={state} path={path} box={box} paperSize={paperSize} effectiveScale={1} />);

    expect(container.querySelector("svg.print-preview-panel__page-svg")).toBeInTheDocument();
  });

  it("renders grid lines when the grid element is enabled", () => {
    const store = new EditorStore();
    store.setPrintSettings({ elements: { ...store.getState().printSettings.elements, grid: true } });
    const state = store.getState();
    const path = boardPath(state.board);
    const box = boundingBoxOf(pathBoundingBoxPoints(path));
    const paperSize = paperDimensionsCm(state.printSettings.paper);

    const { container } = render(<PrintPage state={state} path={path} box={box} paperSize={paperSize} effectiveScale={1} />);

    expect(container.querySelectorAll("line").length).toBeGreaterThan(0);
  });

  it("board outline with background disabled fills with none", () => {
    const store = new EditorStore();
    store.setPrintSettings({ elements: { ...store.getState().printSettings.elements, boardOutline: true, background: false } });
    const state = store.getState();
    const path = boardPath(state.board);
    const box = boundingBoxOf(pathBoundingBoxPoints(path));
    const paperSize = paperDimensionsCm(state.printSettings.paper);

    const { container } = render(<PrintPage state={state} path={path} box={box} paperSize={paperSize} effectiveScale={1} />);

    const outline = container.querySelector('path[stroke="black"]');
    expect(outline).toHaveAttribute("fill", "none");
  });

  it("a Thread Path referencing fewer than 2 resolvable pins is skipped", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    store.addPinPath(layerId, { type: "line", start: { x: 0, y: 0 }, end: { x: 8, y: 0 } });
    const pins = store.getState().pinLayers[0].pinPaths[0].pins;
    const threadLayerId = store.getState().threadLayers[0].id;
    store.extendThreadDraft(pins[0].id);
    store.finishThreadDraftWithSegment(threadLayerId, pins[pins.length - 1].id);
    store.deletePinPath(layerId, store.getState().pinLayers[0].pinPaths[0].id); // orphans the thread's pin ids
    store.setPrintSettings({ elements: { ...store.getState().printSettings.elements, threads: true } });
    const state = store.getState();
    const path = boardPath(state.board);
    const box = boundingBoxOf(pathBoundingBoxPoints(path));
    const paperSize = paperDimensionsCm(state.printSettings.paper);

    expect(() => render(<PrintPage state={state} path={path} box={box} paperSize={paperSize} effectiveScale={1} />)).not.toThrow();
  });

  it("renders a Thread Path with 2+ resolvable pins as a vector path", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    store.addPinPath(layerId, { type: "line", start: { x: 0, y: 0 }, end: { x: 8, y: 0 } });
    const pins = store.getState().pinLayers[0].pinPaths[0].pins;
    const threadLayerId = store.getState().threadLayers[0].id;
    store.extendThreadDraft(pins[0].id);
    store.finishThreadDraftWithSegment(threadLayerId, pins[pins.length - 1].id);
    store.setPrintSettings({ elements: { ...store.getState().printSettings.elements, threads: true } });
    const state = store.getState();
    const path = boardPath(state.board);
    const box = boundingBoxOf(pathBoundingBoxPoints(path));
    const paperSize = paperDimensionsCm(state.printSettings.paper);

    const { container } = render(<PrintPage state={state} path={path} box={box} paperSize={paperSize} effectiveScale={1} />);

    expect(container.querySelector('path[stroke]:not([stroke="black"])')).toBeInTheDocument();
  });

  it("labels a Text Pin Path's pins as closed contours", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    store.addPinPath(layerId, {
      type: "text",
      origin: { x: 0, y: 0 },
      text: "o",
      fontId: "pt-sans",
      weight: "regular",
      italic: false,
      size: 10,
      letterSpacing: 0,
      rotation: 0,
      contours: [
        [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }],
        [{ x: 3, y: 3 }, { x: 7, y: 3 }, { x: 7, y: 7 }, { x: 3, y: 7 }],
      ],
    });
    store.setPrintSettings({ elements: { ...store.getState().printSettings.elements, pins: true, pinNumbers: true } });
    const state = store.getState();
    const path = boardPath(state.board);
    const box = boundingBoxOf(pathBoundingBoxPoints(path));
    const paperSize = paperDimensionsCm(state.printSettings.paper);

    expect(() => render(<PrintPage state={state} path={path} box={box} paperSize={paperSize} effectiveScale={1} />)).not.toThrow();
  });

  it("prints a radially-mirrored pin group's labels using the mirrored centre", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    store.addPinPath(layerId, { type: "line", start: { x: 5, y: 0 }, end: { x: 10, y: 0 } });
    const pathId = store.getState().pinLayers[0].pinPaths[0].id;
    store.select({ type: "pinPaths", refs: [{ layerId, pathId }] });
    store.setSymmetryConfig({ type: "radial", centre: { x: 0, y: 0 }, intervalDegrees: 90 });
    store.setPrintSettings({ elements: { ...store.getState().printSettings.elements, pins: true, pinNumbers: true } });
    const state = store.getState();
    const path = boardPath(state.board);
    const box = boundingBoxOf(pathBoundingBoxPoints(path));
    const paperSize = paperDimensionsCm(state.printSettings.paper);

    const { container } = render(<PrintPage state={state} path={path} box={box} paperSize={paperSize} effectiveScale={1} />);

    expect(container.querySelectorAll("circle").length).toBeGreaterThan(state.pinLayers[0].pinPaths[0].pins.length);
  });
});
