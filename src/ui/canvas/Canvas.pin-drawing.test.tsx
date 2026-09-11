import { render, screen, fireEvent } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";
import { EditorStore } from "../../application/document";
import { Canvas } from "./Canvas";

// Fixed viewport: zoom 4, panOrigin (-40,-40) — chosen so simple screen coordinates map
// to exact integer document coordinates, and lines up with jsdom's zeroed layout.
beforeAll(() => {
  Element.prototype.getBoundingClientRect = () =>
    ({ left: 0, top: 0, right: 720, bottom: 640, width: 720, height: 640, x: 0, y: 0, toJSON() {} }) as DOMRect;
});

function mouseDownAt(svg: Element, clientX: number, clientY: number) {
  fireEvent.mouseDown(svg, { clientX, clientY });
}

describe("Canvas — pin drawing interaction", () => {
  it("drag-creates a circle Pin Path (bounding-box corner to corner)", () => {
    const store = new EditorStore();
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    // screen(200,200) -> doc(10,10); screen(280,280) -> doc(30,30)
    mouseDownAt(svg, 200, 200);
    fireEvent.mouseUp(svg, { clientX: 280, clientY: 280 });

    const paths = store.getState().pinLayers[0].pinPaths;
    expect(paths).toHaveLength(1);
    expect(paths[0].geometry).toMatchObject({ type: "circle", center: { x: 20, y: 20 }, radius: 10 });
  });

  it("two clicks create a Line Pin Path", () => {
    const store = new EditorStore();
    store.setPinTool("line");
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    mouseDownAt(svg, 200, 200); // doc(10,10)
    mouseDownAt(svg, 280, 200); // doc(30,10)

    const paths = store.getState().pinLayers[0].pinPaths;
    expect(paths).toHaveLength(1);
    expect(paths[0].geometry).toEqual({ type: "line", start: { x: 10, y: 10 }, end: { x: 30, y: 10 } });
  });

  it("three clicks create an Arc Pin Path (start, end, curvature)", () => {
    const store = new EditorStore();
    store.setPinTool("arc");
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    mouseDownAt(svg, 200, 200); // start doc(10,10)
    mouseDownAt(svg, 280, 200); // end doc(30,10)
    mouseDownAt(svg, 240, 240); // curvature click doc(20,20) -> bulge below chord

    const paths = store.getState().pinLayers[0].pinPaths;
    expect(paths).toHaveLength(1);
    expect(paths[0].geometry.type).toBe("arc");
  });

  it("drag with the Freehand tool creates a Pin Path following the captured points", () => {
    const store = new EditorStore();
    store.setPinTool("freehand");
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    mouseDownAt(svg, 200, 200); // doc(10,10)
    fireEvent.mouseMove(svg, { clientX: 240, clientY: 200 }); // doc(20,10)
    fireEvent.mouseMove(svg, { clientX: 280, clientY: 200 }); // doc(30,10)
    fireEvent.mouseUp(svg, { clientX: 280, clientY: 200 });

    const paths = store.getState().pinLayers[0].pinPaths;
    expect(paths).toHaveLength(1);
    expect(paths[0].geometry).toMatchObject({
      type: "freehand",
      points: [{ x: 10, y: 10 }, { x: 20, y: 10 }, { x: 30, y: 10 }],
    });
    expect(paths[0].pins.length).toBeGreaterThan(1);
  });

  it("Freehand drag with fewer than two points (a plain click) creates nothing", () => {
    const store = new EditorStore();
    store.setPinTool("freehand");
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    mouseDownAt(svg, 200, 200);
    fireEvent.mouseUp(svg, { clientX: 200, clientY: 200 });

    expect(store.getState().pinLayers[0].pinPaths).toHaveLength(0);
  });

  it("eraser removes the nearest pin on click", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    const pathId = store.addPinPath(layerId, { type: "line", start: { x: 10, y: 10 }, end: { x: 30, y: 10 } })!;
    const targetPin = store.getState().pinLayers[0].pinPaths[0].pins[0]; // (10,10) -> screen(200,200)
    store.setPinTool("eraser");

    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });
    mouseDownAt(svg, 200, 200);

    const remaining = store.getState().pinLayers[0].pinPaths.find((p) => p.id === pathId)!.pins;
    expect(remaining.find((p) => p.id === targetPin.id)).toBeUndefined();
  });

  it("path eraser removes the whole Pin Path (and all its pins) on click", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    store.addPinPath(layerId, { type: "line", start: { x: 10, y: 10 }, end: { x: 30, y: 10 } });
    store.setPinTool("path-eraser");

    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });
    mouseDownAt(svg, 200, 200); // clicks a pin at (10,10), belonging to the path

    expect(store.getState().pinLayers[0].pinPaths).toHaveLength(0);
  });

  it("shows a mirrored preview while drawing, when symmetry is selected", () => {
    const store = new EditorStore();
    store.setPinTool("line");
    store.setSymmetryConfig({ type: "vertical", axis: { x: 20, y: 0 } });
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    mouseDownAt(svg, 200, 200); // dragStart doc(10,10)
    fireEvent.mouseMove(svg, { clientX: 280, clientY: 200 }); // cursor doc(30,10)

    expect(screen.getByTestId("pin-preview")).toBeInTheDocument();
    const mirrored = screen.getByTestId("pin-preview-mirror");
    expect(mirrored).toBeInTheDocument();
    expect(mirrored.getAttribute("transform")).toBe("translate(40 0) scale(-1 1)");
  });

  it("outlines the nearest grid point while grid-snap is on, even when the grid is hidden", () => {
    const store = new EditorStore();
    store.setGrid({ visible: false, snapEnabled: true });
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    fireEvent.mouseMove(svg, { clientX: 200, clientY: 200 }); // doc(10,10), a grid intersection at gap=1

    const indicator = screen.getByTestId("grid-snap-indicator");
    expect(indicator).toBeInTheDocument();
  });

  it("does not show the grid-snap indicator when a pin wins snap priority instead", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    store.addPinPath(layerId, { type: "line", start: { x: 10, y: 10 }, end: { x: 30, y: 10 } });
    store.setGrid({ visible: false, snapEnabled: true });
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    fireEvent.mouseMove(svg, { clientX: 200, clientY: 200 }); // doc(10,10) — also the line's start pin

    expect(screen.queryByTestId("grid-snap-indicator")).not.toBeInTheDocument();
  });

  it("live status bar reflects vertex-anchored pin counts for a hexagon before mouse-up", () => {
    const store = new EditorStore();
    store.setPinTool("hexagon");
    const { container } = render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    mouseDownAt(svg, 160, 160); // centre doc(0,0)
    fireEvent.mouseMove(svg, { clientX: 180, clientY: 160 }); // doc(5,0) -> radius 5 -> side 5

    // spacing defaults to 1cm; each 5cm edge divides evenly into 5 -> 30 pins total
    expect(container.textContent).toContain("Perimeter: 30.0 cm | Requested: 1.0 cm | Actual: 1.00 cm | Pins: 30");
  });

  it("live status bar reflects vertex-anchored (forced-endpoint) pin counts for a Line before mouse-up", () => {
    const store = new EditorStore();
    store.setPinTool("line");
    store.setGrid({ snapEnabled: false });
    const { container } = render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    mouseDownAt(svg, 160, 160); // dragStart doc(0,0)
    fireEvent.mouseMove(svg, { clientX: 190, clientY: 160 }); // cursor doc(7.5,0)

    expect(container.textContent).toContain("Length: 7.5 cm | Requested: 1.0 cm | Actual: 0.94 cm | Pins: 9");
  });

  it("select mode selects the Pin Path owning the clicked pin", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    const pathId = store.addPinPath(layerId, { type: "line", start: { x: 10, y: 10 }, end: { x: 30, y: 10 } })!;
    store.setMode("select");

    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });
    mouseDownAt(svg, 200, 200); // doc(10,10), the line's start pin

    expect(store.getState().selection).toEqual({ type: "pinPath", layerId, pathId });
  });
});
