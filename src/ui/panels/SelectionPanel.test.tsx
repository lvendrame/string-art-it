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
    store.select({ type: "pinPaths", refs: [{ layerId, pathId }] });
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
    store.select({ type: "pinPaths", refs: [{ layerId, pathId }] });

    render(<SelectionPanel store={store} />);
    fireEvent.click(screen.getByRole("button", { name: "Delete Pin Path" }));

    expect(store.getState().pinLayers[0].pinPaths).toHaveLength(0);
    expect(store.getState().selection).toEqual({ type: "none" });
  });

  // docs/specs/26-edit-mode-multi-select.md — multi-selection summary states.
  it("shows a summary (no per-shape fields) when multiple Pin Paths are selected", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    const pathIdA = store.addPinPath(layerId, { type: "circle", center: { x: 0, y: 0 }, radius: 5 })!;
    const pathIdB = store.addPinPath(layerId, { type: "circle", center: { x: 10, y: 0 }, radius: 5 })!;
    store.select({ type: "pinPaths", refs: [{ layerId, pathId: pathIdA }, { layerId, pathId: pathIdB }] });

    render(<SelectionPanel store={store} />);

    expect(screen.getByText(/2 Pin Paths selected/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete Pin Path" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Radius")).not.toBeInTheDocument();
  });

  it("shows a summary when individual pins are selected (Pins granularity)", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    const pathId = store.addPinPath(layerId, { type: "circle", center: { x: 0, y: 0 }, radius: 5 })!;
    const pins = store.getState().pinLayers[0].pinPaths[0].pins;
    store.setSelectGranularity("pins");
    store.select({ type: "pins", refs: [{ layerId, pathId, pinId: pins[0].id }, { layerId, pathId, pinId: pins[1].id }] });

    render(<SelectionPanel store={store} />);

    expect(screen.getByText(/2 pins selected/)).toBeInTheDocument();
  });
});
