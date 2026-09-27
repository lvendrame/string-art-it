import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EditorStore } from "@application/document";
import { RepeatSettingsBox } from "./RepeatSettingsBox";

function renderBox(store: EditorStore) {
  return render(<RepeatSettingsBox store={store} settings={store.getState().repeatSettings} />);
}

describe("RepeatSettingsBox", () => {
  it("Cycles writes through the store, clamped to 1–20", () => {
    const store = new EditorStore();
    const { rerender } = renderBox(store);
    fireEvent.change(screen.getByLabelText("Cycles"), { target: { value: "3" } });
    expect(store.getState().repeatSettings.cycles).toBe(3);

    rerender(<RepeatSettingsBox store={store} settings={store.getState().repeatSettings} />);
    fireEvent.change(screen.getByLabelText("Cycles"), { target: { value: "99" } });
    expect(store.getState().repeatSettings.cycles).toBe(20);

    fireEvent.change(screen.getByLabelText("Cycles"), { target: { value: "" } });
    expect(store.getState().repeatSettings.cycles).toBe(1);
  });

  it("Full-fill makes Cycles read-only", () => {
    const store = new EditorStore();
    renderBox(store);
    fireEvent.click(screen.getByLabelText("Full-fill"));
    expect(store.getState().repeatSettings.fullFill).toBe(true);

    renderBox(store);
    expect(screen.getAllByLabelText("Cycles")[1]).toBeDisabled();
  });

  it("allows up to Cycles + 2 colours", () => {
    const store = new EditorStore();
    store.setRepeatSettings({ cycles: 1 });
    const { rerender } = renderBox(store);
    const add = () => {
      fireEvent.click(screen.getByRole("button", { name: "Add colour" }));
      rerender(<RepeatSettingsBox store={store} settings={store.getState().repeatSettings} />);
    };
    add();
    add();
    expect(store.getState().repeatSettings.colours).toHaveLength(3);
    expect(screen.getByRole("button", { name: "Add colour" })).toBeDisabled();
    expect(screen.getByText("Up to 3 (Cycles + 2)")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Colour 2"), { target: { value: "#123456" } });
    expect(store.getState().repeatSettings.colours[1]).toBe("#123456");

    fireEvent.click(screen.getByRole("button", { name: "Remove last colour" }));
    expect(store.getState().repeatSettings.colours).toHaveLength(2);
  });
});
