import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EditorStore } from "@application/document";
import { zoomToPercent } from "@domain/transforms";
import { CanvasToolbar } from "./CanvasToolbar";

function renderToolbar(store: EditorStore) {
  const { rerender } = render(<CanvasToolbar store={store} />);
  const update = () => rerender(<CanvasToolbar store={store} />);
  store.subscribe(update);
}

describe("CanvasToolbar", () => {
  it("toggles grid visibility", () => {
    const store = new EditorStore();
    renderToolbar(store);
    const before = store.getState().grid.visible;

    fireEvent.click(screen.getByRole("button", { name: /^grid (on|off)$/i }));

    expect(store.getState().grid.visible).toBe(!before);
  });

  it("toggles snap", () => {
    const store = new EditorStore();
    renderToolbar(store);
    const before = store.getState().grid.snapEnabled;

    fireEvent.click(screen.getByRole("button", { name: /snap/i }));

    expect(store.getState().grid.snapEnabled).toBe(!before);
  });

  it("zoom in/out buttons change the viewport zoom", () => {
    const store = new EditorStore();
    renderToolbar(store);
    const before = store.getState().viewport.zoom;

    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(store.getState().viewport.zoom).toBeGreaterThan(before);

    const afterIn = store.getState().viewport.zoom;
    fireEvent.click(screen.getByRole("button", { name: "Zoom out" }));
    expect(store.getState().viewport.zoom).toBeLessThan(afterIn);
  });

  it("fit button resets the viewport to fit the board", () => {
    const store = new EditorStore();
    renderToolbar(store);
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    const zoomed = store.getState().viewport.zoom;

    fireEvent.click(screen.getByRole("button", { name: "Fit" }));

    expect(store.getState().viewport.zoom).not.toBe(zoomed);
    expect(Math.round(zoomToPercent(store.getState().viewport.zoom))).toBeGreaterThan(0);
  });
});
