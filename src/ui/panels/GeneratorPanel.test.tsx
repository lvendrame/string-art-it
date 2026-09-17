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
});
