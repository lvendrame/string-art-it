import { render, screen, fireEvent } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";
import { EditorStore } from "@application/document";
import { Canvas } from "./Canvas";

// docs/specs/33-pin-path-tool.md — same fixed-viewport setup as Canvas.pin-drawing.test.tsx
// (zoom 4, panOrigin (-40,-40)): screen(200,200) -> doc(10,10); default snap radius 12px /
// zoom 4 = 3 doc units, so a click within 3 units of doc(10,10) counts as "near the first vertex".
beforeAll(() => {
  Element.prototype.getBoundingClientRect = () =>
    ({ left: 0, top: 0, right: 720, bottom: 640, width: 720, height: 640, x: 0, y: 0, toJSON() {} }) as DOMRect;
});

function mouseDownAt(svg: Element, clientX: number, clientY: number) {
  fireEvent.mouseDown(svg, { clientX, clientY });
}

describe("Canvas — Path tool (Polygon draft) interaction", () => {
  it("clicks add vertices to the draft, with a live preview to the cursor", () => {
    const store = new EditorStore();
    store.setPinTool("polygon");
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    mouseDownAt(svg, 200, 200); // doc(10,10)
    expect(store.getState().polygonDraft).toEqual({ points: [{ x: 10, y: 10 }] });

    mouseDownAt(svg, 280, 200); // doc(30,10)
    mouseDownAt(svg, 280, 280); // doc(30,30)
    expect(store.getState().polygonDraft).toEqual({
      points: [{ x: 10, y: 10 }, { x: 30, y: 10 }, { x: 30, y: 30 }],
    });
    expect(screen.getByTestId("pin-preview")).toBeTruthy();
  });

  it("Escape finishes a 3+ vertex draft into a closed Pin Path", () => {
    const store = new EditorStore();
    store.setPinTool("polygon");
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    mouseDownAt(svg, 200, 200); // doc(10,10)
    mouseDownAt(svg, 280, 200); // doc(30,10)
    mouseDownAt(svg, 280, 280); // doc(30,30)
    fireEvent.keyDown(window, { key: "Escape" });

    expect(store.getState().polygonDraft).toBeNull();
    const paths = store.getState().pinLayers[0].pinPaths;
    expect(paths).toHaveLength(1);
    expect(paths[0].geometry).toEqual({
      type: "polygon",
      points: [{ x: 10, y: 10 }, { x: 30, y: 10 }, { x: 30, y: 30 }],
    });
  });

  it("Escape silently discards a draft with fewer than 3 vertices", () => {
    const store = new EditorStore();
    store.setPinTool("polygon");
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    mouseDownAt(svg, 200, 200);
    mouseDownAt(svg, 280, 200);
    fireEvent.keyDown(window, { key: "Escape" });

    expect(store.getState().polygonDraft).toBeNull();
    expect(store.getState().pinLayers[0].pinPaths).toHaveLength(0);
  });

  it("ArrowLeft retracts the last vertex", () => {
    const store = new EditorStore();
    store.setPinTool("polygon");
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    mouseDownAt(svg, 200, 200); // doc(10,10)
    mouseDownAt(svg, 280, 200); // doc(30,10)
    mouseDownAt(svg, 280, 280); // doc(30,30)
    fireEvent.keyDown(window, { key: "ArrowLeft" });

    expect(store.getState().polygonDraft).toEqual({
      points: [{ x: 10, y: 10 }, { x: 30, y: 10 }],
    });
  });

  it("clicking back near the first vertex closes the polygon instead of adding a new vertex", () => {
    const store = new EditorStore();
    store.setPinTool("polygon");
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    mouseDownAt(svg, 200, 200); // doc(10,10) — first vertex
    mouseDownAt(svg, 280, 200); // doc(30,10)
    mouseDownAt(svg, 280, 280); // doc(30,30)
    mouseDownAt(svg, 280, 360); // doc(30,50)
    // Click within the 3-doc-unit snap radius of the first vertex, doc(10,10):
    // screen(208,208) -> doc(12,12), distance sqrt(2^2+2^2) ≈ 2.83 < 3.
    mouseDownAt(svg, 208, 208);

    expect(store.getState().polygonDraft).toBeNull();
    const paths = store.getState().pinLayers[0].pinPaths;
    expect(paths).toHaveLength(1);
    expect(paths[0].geometry).toEqual({
      type: "polygon",
      points: [{ x: 10, y: 10 }, { x: 30, y: 10 }, { x: 30, y: 30 }, { x: 30, y: 50 }],
    });
  });

  it("switching Pin tool away from Path discards an in-progress draft", () => {
    const store = new EditorStore();
    store.setPinTool("polygon");
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    mouseDownAt(svg, 200, 200);
    mouseDownAt(svg, 280, 200);
    mouseDownAt(svg, 280, 280);
    store.setPinTool("line");

    expect(store.getState().polygonDraft).toBeNull();
  });
});
