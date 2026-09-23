import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EditorStore } from "../../../application/document";
import { ZigzagSettingsBox } from "./ZigzagSettingsBox";

describe("ZigzagSettingsBox", () => {
  it("changing Step A writes through the store", () => {
    const store = new EditorStore();
    render(<ZigzagSettingsBox store={store} settings={store.getState().zigzagSettings} />);

    fireEvent.change(screen.getByLabelText("Step A"), { target: { value: "5" } });
    expect(store.getState().zigzagSettings.stepA).toBe(5);
  });
});
