import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EditorStore } from "../../application/document";
import { SelectionPanel } from "./SelectionPanel";

describe("SelectionPanel", () => {
  it("shows a placeholder when nothing is selected", () => {
    const store = new EditorStore();
    render(<SelectionPanel store={store} />);
    expect(screen.getByText(/Click a pin to select/)).toBeInTheDocument();
  });

  it("editing radius recalculates pins", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    const pathId = store.addPinPath(layerId, { type: "circle", center: { x: 0, y: 0 }, radius: 5 })!;
    store.select({ type: "pinPath", layerId, pathId });
    const before = store.getState().pinLayers[0].pinPaths[0].pins.length;

    render(<SelectionPanel store={store} />);
    fireEvent.change(screen.getByLabelText("Radius"), { target: { value: "20" } });

    const after = store.getState().pinLayers[0].pinPaths[0].pins.length;
    expect(after).not.toBe(before);
  });

  it("delete button removes the pin path and clears selection", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    const pathId = store.addPinPath(layerId, { type: "circle", center: { x: 0, y: 0 }, radius: 5 })!;
    store.select({ type: "pinPath", layerId, pathId });

    render(<SelectionPanel store={store} />);
    fireEvent.click(screen.getByRole("button", { name: "Delete Pin Path" }));

    expect(store.getState().pinLayers[0].pinPaths).toHaveLength(0);
    expect(store.getState().selection).toEqual({ type: "none" });
  });
});
