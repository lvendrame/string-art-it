import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EditorStore } from "../../application/document";
import { LayersPanel } from "./LayersPanel";

describe("LayersPanel", () => {
  it("shows Pin Layers by default with the default layer listed", () => {
    const store = new EditorStore();
    render(<LayersPanel store={store} />);
    expect(screen.getByText("Layer 1")).toBeInTheDocument();
  });

  it("switching to the Thread Layers tab shows thread layers instead", () => {
    const store = new EditorStore();
    render(<LayersPanel store={store} />);

    fireEvent.click(screen.getByRole("button", { name: "Thread Layers" }));

    expect(store.getState().layerPanelTab).toBe("thread");
  });

  it("toggling visibility updates the store without selecting the layer", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    render(<LayersPanel store={store} />);

    fireEvent.click(screen.getByRole("button", { name: "Hide Layer 1" }));

    expect(store.getState().pinLayers[0].visible).toBe(false);
    expect(store.getState().activePinLayerId).toBe(layerId); // click didn't also select
  });

  it("New Layer creates a layer and Delete removes the active one", () => {
    const store = new EditorStore();
    render(<LayersPanel store={store} />);

    fireEvent.click(screen.getByRole("button", { name: "New Layer" }));
    expect(store.getState().pinLayers).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(store.getState().pinLayers).toHaveLength(1);
  });
});
