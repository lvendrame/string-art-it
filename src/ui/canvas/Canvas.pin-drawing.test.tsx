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
