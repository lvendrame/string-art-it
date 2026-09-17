import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EditorStore } from "../../application/document";
import { GeneratorPanel } from "./GeneratorPanel";

// docs/specs/32-generator-mode.md
describe("GeneratorPanel", () => {
  it("defaults to the Mandala pattern with its default fields", () => {
    const store = new EditorStore();
    render(<GeneratorPanel store={store} />);
    expect(screen.getByRole("combobox", { name: "Pattern" })).toHaveValue("mandala");
    expect(screen.getByLabelText("Pins")).toHaveValue(180);
    expect(screen.getByLabelText("Base")).toHaveValue(2);
    expect(screen.getByLabelText("Layers")).toHaveValue(1);
  });

  it("Generate creates a draft and the button becomes Re-generate; Confirm appears", () => {
    const store = new EditorStore();
    render(<GeneratorPanel store={store} />);

    expect(screen.queryByRole("button", { name: "Confirm" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Generate" }));

    expect(store.getState().generatorDraft?.pinPaths[0].pins).toHaveLength(180);
    expect(screen.getByRole("button", { name: "Re-generate" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
  });

  it("editing a field before Re-generate changes the next draft", () => {
    const store = new EditorStore();
    render(<GeneratorPanel store={store} />);
    fireEvent.change(screen.getByLabelText("Pins"), { target: { value: "40" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate" }));
    expect(store.getState().generatorDraft?.pinPaths[0].pins).toHaveLength(40);
  });

  it("switching pattern resets fields to that pattern's own defaults", () => {
    const store = new EditorStore();
    render(<GeneratorPanel store={store} />);
    fireEvent.change(screen.getByRole("combobox", { name: "Pattern" }), { target: { value: "spirals" } });
    expect(screen.getByLabelText("Arms")).toHaveValue(3);
    expect(screen.getByLabelText("Nails per spiral")).toHaveValue(80);
  });

  it("Confirm commits the draft and the panel reverts to Generate with no Confirm button", () => {
    const store = new EditorStore();
    render(<GeneratorPanel store={store} />);
    fireEvent.click(screen.getByRole("button", { name: "Generate" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    expect(store.getState().generatorDraft).toBeNull();
    expect(store.getState().pinLayers).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Generate" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirm" })).not.toBeInTheDocument();
  });

  it("renders the Freestyle pattern's per-circle field groups", () => {
    const store = new EditorStore();
    render(<GeneratorPanel store={store} />);
    fireEvent.change(screen.getByRole("combobox", { name: "Pattern" }), { target: { value: "freestyle" } });
    expect(screen.getByText("Circle 1")).toBeInTheDocument();
    expect(screen.getByText("Circle 2")).toBeInTheDocument();
    expect(screen.getByText("Circle 3")).toBeInTheDocument();
  });

  // docs/specs/32-generator-mode.md §Multicolor
  describe("multicolor palette", () => {
    it("starts with exactly 1 colour; Add is disabled at the pattern's cap (Mandala defaults to layers=1)", () => {
      const store = new EditorStore();
      render(<GeneratorPanel store={store} />);
      expect(screen.getAllByLabelText(/^Colour \d$/)).toHaveLength(1);
      expect(screen.getByRole("button", { name: "Add colour" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Remove last colour" })).toBeDisabled();
    });

    it("Add is enabled once layers > 1, and adds swatches up to that cap", () => {
      const store = new EditorStore();
      render(<GeneratorPanel store={store} />);
      fireEvent.change(screen.getByLabelText("Layers"), { target: { value: "3" } });

      const addBtn = screen.getByRole("button", { name: "Add colour" });
      expect(addBtn).not.toBeDisabled();
      fireEvent.click(addBtn);
      expect(screen.getAllByLabelText(/^Colour \d$/)).toHaveLength(2);
      fireEvent.click(addBtn);
      expect(screen.getAllByLabelText(/^Colour \d$/)).toHaveLength(3);
      expect(addBtn).toBeDisabled(); // capped at layers=3
    });

    it("Remove drops the last swatch; disabled again at 1", () => {
      const store = new EditorStore();
      render(<GeneratorPanel store={store} />);
      fireEvent.change(screen.getByLabelText("Layers"), { target: { value: "2" } });
      fireEvent.click(screen.getByRole("button", { name: "Add colour" }));
      expect(screen.getAllByLabelText(/^Colour \d$/)).toHaveLength(2);

      fireEvent.click(screen.getByRole("button", { name: "Remove last colour" }));
      expect(screen.getAllByLabelText(/^Colour \d$/)).toHaveLength(1);
      expect(screen.getByRole("button", { name: "Remove last colour" })).toBeDisabled();
    });

    it("switching to a 1-colour-max pattern visually clamps the swatches shown", () => {
      const store = new EditorStore();
      render(<GeneratorPanel store={store} />);
      fireEvent.change(screen.getByLabelText("Layers"), { target: { value: "4" } });
      fireEvent.click(screen.getByRole("button", { name: "Add colour" }));
      fireEvent.click(screen.getByRole("button", { name: "Add colour" }));
      expect(screen.getAllByLabelText(/^Colour \d$/)).toHaveLength(3);

      fireEvent.change(screen.getByRole("combobox", { name: "Pattern" }), { target: { value: "star" } });
      expect(screen.getAllByLabelText(/^Colour \d$/)).toHaveLength(1);
    });

    it("Generate colours each layer's Thread Path from the chosen palette, cycling by index", () => {
      const store = new EditorStore();
      render(<GeneratorPanel store={store} />);
      fireEvent.change(screen.getByLabelText("Layers"), { target: { value: "3" } });
      fireEvent.click(screen.getByRole("button", { name: "Add colour" }));

      const swatches = screen.getAllByLabelText(/^Colour \d$/);
      fireEvent.change(swatches[0], { target: { value: "#111111" } });
      fireEvent.change(swatches[1], { target: { value: "#222222" } });
      fireEvent.click(screen.getByRole("button", { name: "Generate" }));

      const threadColours = store.getState().generatorDraft?.threadPaths.map((t) => t.colours);
      expect(threadColours).toEqual([["#111111"], ["#222222"], ["#111111"]]);
    });
  });
});
