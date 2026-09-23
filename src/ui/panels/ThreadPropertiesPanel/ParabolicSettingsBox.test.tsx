import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EditorStore } from "@application/document";
import { ParabolicSettingsBox } from "./ParabolicSettingsBox";

describe("ParabolicSettingsBox", () => {
  it("Cycles is disabled until Full-fill is checked", () => {
    const store = new EditorStore();
    render(<ParabolicSettingsBox store={store} settings={store.getState().parabolicSettings} />);

    expect(screen.getByLabelText("Cycles")).toBeDisabled();
    fireEvent.click(screen.getByLabelText("Full-fill"));
    expect(store.getState().parabolicSettings.fullFill).toBe(true);
  });

  it("changing Step A, Step B and Cycles write through the store", () => {
    const store = new EditorStore();
    store.setParabolicSettings({ fullFill: true });
    render(<ParabolicSettingsBox store={store} settings={store.getState().parabolicSettings} />);

    fireEvent.change(screen.getByLabelText("Step A"), { target: { value: "4" } });
    expect(store.getState().parabolicSettings.stepA).toBe(4);

    fireEvent.change(screen.getByLabelText("Step B"), { target: { value: "6" } });
    expect(store.getState().parabolicSettings.stepB).toBe(6);

    fireEvent.change(screen.getByLabelText("Cycles"), { target: { value: "5" } });
    expect(store.getState().parabolicSettings.cycles).toBe(5);
  });
});
