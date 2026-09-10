import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EditorStore } from "../../application/document";
import { BoardSetup } from "./BoardSetup";

describe("BoardSetup", () => {
  it("shows only the relevant dimension field per shape (docs/specs/03)", () => {
    const store = new EditorStore();
    render(<BoardSetup store={store} onContinue={() => {}} />);

    expect(screen.getByLabelText(/Diameter/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Width/)).not.toBeInTheDocument();
  });

  it("selecting Rectangle swaps in Width/Height fields", () => {
    const store = new EditorStore();
    render(<BoardSetup store={store} onContinue={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));

    expect(screen.getByLabelText(/Width/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Height/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Diameter/)).not.toBeInTheDocument();
  });

  it("selecting Triangle requires a sub-type choice before dimension fields for that type appear", () => {
    const store = new EditorStore();
    render(<BoardSetup store={store} onContinue={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: "Triangle" }));
    expect(screen.getByRole("button", { name: "Equilateral" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Right-angled" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Right-angled" }));
    expect(screen.getByLabelText(/Base/)).toBeInTheDocument();
    expect(screen.getByText(/Hypotenuse:/)).toBeInTheDocument();
  });

  it("continue button invokes onContinue", () => {
    const store = new EditorStore();
    const onContinue = vi.fn();
    render(<BoardSetup store={store} onContinue={onContinue} />);

    fireEvent.click(screen.getByRole("button", { name: "Continue to Editor" }));
    expect(onContinue).toHaveBeenCalled();
  });
});
