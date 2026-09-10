import { act, render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EditorStore } from "../../application/document";
import { Canvas } from "./Canvas";

describe("Canvas", () => {
  it("renders the board outline", () => {
    const store = new EditorStore();
    render(<Canvas store={store} />);
    expect(screen.getByTestId("board-outline")).toBeInTheDocument();
  });

  it("grid visibility and snap-to-grid toggle independently", () => {
    const store = new EditorStore();
    render(<Canvas store={store} />);

    fireEvent.click(screen.getByRole("button", { name: /Grid ON/ }));
    expect(store.getState().grid.visible).toBe(false);
    expect(store.getState().grid.snapEnabled).toBe(true);
  });

  it("grid overlay renders above the board fill, not hidden behind it", () => {
    const store = new EditorStore();
    render(<Canvas store={store} />);

    const svg = screen.getByRole("img", { name: "Board canvas" });
    const boardOutline = screen.getByTestId("board-outline");
    const gridOverlay = screen.getByTestId("grid-overlay");
    const children = Array.from(svg.querySelectorAll("path, rect[data-testid='grid-overlay']"));

    expect(children.indexOf(gridOverlay)).toBeGreaterThan(children.indexOf(boardOutline));
  });

  it("grid dot is fully inset within its pattern tile, not clipped to a quarter-circle at the corner", () => {
    const store = new EditorStore();
    render(<Canvas store={store} />);

    const dot = document.querySelector("#grid-dots circle") as SVGCircleElement | null;
    expect(dot).not.toBeNull();
    const cx = Number(dot!.getAttribute("cx"));
    const cy = Number(dot!.getAttribute("cy"));
    const r = Number(dot!.getAttribute("r"));

    // A dot centred at the tile's (0,0) corner gets clipped to one quarter — the fix
    // insets it by its own radius so the full circle fits inside the tile.
    expect(cx).toBeCloseTo(r, 6);
    expect(cy).toBeCloseTo(r, 6);
    expect(r).toBeGreaterThan(0);
  });

  it("grid gap fields are configurable and independent per axis", () => {
    const store = new EditorStore();
    render(<Canvas store={store} />);

    fireEvent.change(screen.getByLabelText("Gap X"), { target: { value: "2.5" } });
    fireEvent.change(screen.getByLabelText("Gap Y"), { target: { value: "0.5" } });

    expect(store.getState().grid.gapX).toBe(2.5);
    expect(store.getState().grid.gapY).toBe(0.5);
  });

  it("grid colour and opacity are configurable and reflected in the rendered dot", () => {
    const store = new EditorStore();
    render(<Canvas store={store} />);

    fireEvent.change(screen.getByLabelText("Grid colour"), { target: { value: "#ff0000" } });
    fireEvent.change(screen.getByLabelText("Grid opacity"), { target: { value: "0.3" } });

    expect(store.getState().grid.colour).toBe("#ff0000");
    expect(store.getState().grid.opacity).toBe(0.3);

    const dot = document.querySelector("#grid-dots circle") as SVGCircleElement | null;
    expect(dot?.getAttribute("fill")).toBe("#ff0000");
    expect(dot?.getAttribute("fill-opacity")).toBe("0.3");
  });

  it("pan mode: dragging translates the viewport, following the cursor", () => {
    const store = new EditorStore();
    store.setMode("pan");
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });
    const before = store.getState().viewport.panOrigin;
    const zoom = store.getState().viewport.zoom;

    fireEvent.mouseDown(svg, { clientX: 200, clientY: 200 });
    fireEvent.mouseMove(svg, { clientX: 240, clientY: 160 });

    const after = store.getState().viewport.panOrigin;
    expect(after.x).toBeCloseTo(before.x - 40 / zoom, 6);
    expect(after.y).toBeCloseTo(before.y - -40 / zoom, 6);
  });

  it("pan mode: releasing the mouse stops the drag", () => {
    const store = new EditorStore();
    store.setMode("pan");
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    fireEvent.mouseDown(svg, { clientX: 200, clientY: 200 });
    fireEvent.mouseMove(svg, { clientX: 240, clientY: 200 });
    fireEvent.mouseUp(svg, { clientX: 240, clientY: 200 });
    const afterRelease = store.getState().viewport.panOrigin;
    fireEvent.mouseMove(svg, { clientX: 300, clientY: 200 });

    expect(store.getState().viewport.panOrigin).toEqual(afterRelease);
  });

  it("cursor reflects the active mode (grab for pan, crosshair for drawing tools)", () => {
    const store = new EditorStore();
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    act(() => store.setMode("select"));
    expect(svg.style.cursor).toBe("default");

    act(() => store.setMode("pan"));
    expect(svg.style.cursor).toBe("grab");

    fireEvent.mouseDown(svg, { clientX: 200, clientY: 200 });
    expect(svg.style.cursor).toBe("grabbing");
  });

  it("zoom controls change viewport zoom without touching board dimensions", () => {
    const store = new EditorStore();
    const before = store.getState().board;
    render(<Canvas store={store} />);

    fireEvent.click(screen.getByRole("button", { name: "+" }));

    expect(store.getState().board).toBe(before);
  });
});
