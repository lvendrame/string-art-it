import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EditorStore } from "@application/document";
import { RadialSettingsBox } from "./RadialSettingsBox";

describe("RadialSettingsBox", () => {
  it("shows the default step of 1", () => {
    const store = new EditorStore();
    render(<RadialSettingsBox store={store} settings={store.getState().radialSettings} />);

    expect(screen.getByLabelText("Step")).toHaveValue("1");
  });

  it("changing Step writes through the store", () => {
    const store = new EditorStore();
    render(<RadialSettingsBox store={store} settings={store.getState().radialSettings} />);

    fireEvent.change(screen.getByLabelText("Step"), { target: { value: "3" } });
    expect(store.getState().radialSettings.step).toBe(3);
  });
});
