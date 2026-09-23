import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EditorStore } from "@application/document";
import { BoardSetup } from "./BoardSetup";

describe("BoardSetup", () => {
  it("renders its title as an h2, since LandingHero owns the page's h1", () => {
    const store = new EditorStore();
    render(<BoardSetup store={store} onContinue={() => {}} />);

    expect(screen.getByRole("heading", { level: 2, name: "New Board" })).toBeInTheDocument();
  });

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

describe("BoardSetup keyboard shortcuts", () => {
  it("Enter continues to the Editor", () => {
    const store = new EditorStore();
    const onContinue = vi.fn();
    render(<BoardSetup store={store} onContinue={onContinue} />);

    fireEvent.keyDown(window, { key: "Enter" });

    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("Enter is ignored while a dimension field has focus", () => {
    const store = new EditorStore();
    const onContinue = vi.fn();
    render(<BoardSetup store={store} onContinue={onContinue} />);
    const diameterField = screen.getByLabelText(/Diameter/);
    diameterField.focus();

    fireEvent.keyDown(diameterField, { key: "Enter" });

    expect(onContinue).not.toHaveBeenCalled();
  });

  it("L opens the language dropdown, a second L cycles to the next language", () => {
    const store = new EditorStore();
    render(<BoardSetup store={store} onContinue={() => {}} />);

    fireEvent.keyDown(window, { key: "l" });
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "l" });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument(); // closes after applying the next language
  });

  it("uppercase L also opens the language dropdown", () => {
    const store = new EditorStore();
    render(<BoardSetup store={store} onContinue={() => {}} />);

    fireEvent.keyDown(window, { key: "L" });
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });
});
