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
});
