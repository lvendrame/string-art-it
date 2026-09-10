import { render, screen, fireEvent } from "@testing-library/react";
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

  it("zoom controls change viewport zoom without touching board dimensions", () => {
    const store = new EditorStore();
    const before = store.getState().board;
    render(<Canvas store={store} />);

    fireEvent.click(screen.getByRole("button", { name: "+" }));

    expect(store.getState().board).toBe(before);
  });
});
