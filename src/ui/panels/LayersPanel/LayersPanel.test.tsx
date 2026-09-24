import { act, render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EditorStore } from "@application/document";
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

  it("Delete is a no-op with only one layer left", () => {
    const store = new EditorStore();
    render(<LayersPanel store={store} />);

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(store.getState().pinLayers).toHaveLength(1);
  });

  it("clicking a row selects that layer", () => {
    const store = new EditorStore();
    store.addPinLayer();
    const [firstId] = store.getState().pinLayers.map((l) => l.id);
    render(<LayersPanel store={store} />);

    fireEvent.click(screen.getByText("Layer 1"));

    expect(store.getState().activePinLayerId).toBe(firstId);
  });

  it("toggling lock updates the store", () => {
    const store = new EditorStore();
    render(<LayersPanel store={store} />);

    fireEvent.click(screen.getByRole("button", { name: "Lock Layer 1" }));

    expect(store.getState().pinLayers[0].locked).toBe(true);
  });

  it("renaming a layer via the row commits through the store, falling back to the old name if blanked", () => {
    const store = new EditorStore();
    render(<LayersPanel store={store} />);

    fireEvent.doubleClick(screen.getByText("Layer 1"));
    const input = screen.getByDisplayValue("Layer 1");
    fireEvent.change(input, { target: { value: "Custom Name" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(store.getState().pinLayers[0].name).toBe("Custom Name");

    fireEvent.doubleClick(screen.getByText("Custom Name"));
    const input2 = screen.getByDisplayValue("Custom Name");
    fireEvent.change(input2, { target: { value: "   " } });
    fireEvent.keyDown(input2, { key: "Enter" });
    expect(store.getState().pinLayers[0].name).toBe("Custom Name"); // blank trims to nothing, falls back
  });

  it("Duplicate and reorder (up/down) act on the active layer", () => {
    const store = new EditorStore();
    store.addPinLayer();
    const [firstId, secondId] = store.getState().pinLayers.map((l) => l.id);
    store.setActivePinLayer(secondId);
    render(<LayersPanel store={store} />);

    fireEvent.click(screen.getByRole("button", { name: "Duplicate" }));
    expect(store.getState().pinLayers).toHaveLength(3);

    fireEvent.click(screen.getByRole("button", { name: "Move layer up" }));
    expect(store.getState().pinLayers.map((l) => l.id)[0]).toBe(secondId);

    fireEvent.click(screen.getByRole("button", { name: "Move layer down" }));
    expect(store.getState().pinLayers.map((l) => l.id)[1]).toBe(secondId);
    expect(firstId).toBeTruthy();
  });

  it("Merge into layer above is disabled on the topmost layer and enabled otherwise, merging on click", () => {
    const store = new EditorStore();
    const firstId = store.getState().pinLayers[0].id;
    render(<LayersPanel store={store} />);

    expect(screen.getByRole("button", { name: "Merge into layer above" })).toBeDisabled();

    act(() => store.addPinLayer());
    const secondId = store.getState().activePinLayerId!;
    expect(screen.getByRole("button", { name: "Merge into layer above" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Merge into layer above" }));

    expect(store.getState().pinLayers).toHaveLength(1);
    expect(store.getState().pinLayers[0].id).toBe(firstId);
    expect(secondId).toBeTruthy();
  });

  it("Merge into layer above is disabled when either the active or target layer is locked", () => {
    const store = new EditorStore();
    store.addPinLayer();
    const secondId = store.getState().activePinLayerId!;
    render(<LayersPanel store={store} />);

    fireEvent.click(screen.getByRole("button", { name: "Lock Layer 1" }));
    expect(screen.getByRole("button", { name: "Merge into layer above" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Unlock Layer 1" }));
    act(() => store.togglePinLayerLocked(secondId));
    expect(screen.getByRole("button", { name: "Merge into layer above" })).toBeDisabled();
  });

  describe("Thread Layers tab", () => {
    function switchToThreadTab(store: EditorStore) {
      render(<LayersPanel store={store} />);
      fireEvent.click(screen.getByRole("button", { name: "Thread Layers" }));
    }

    it("selecting, toggling visibility/lock, renaming, duplicating, reordering, and deleting all act on Thread Layers", () => {
      const store = new EditorStore();
      store.addThreadLayer();
      const [firstId, secondId] = store.getState().threadLayers.map((l) => l.id);
      switchToThreadTab(store);

      fireEvent.click(screen.getByText("Layer 1"));
      expect(store.getState().activeThreadLayerId).toBe(firstId);

      fireEvent.click(screen.getByRole("button", { name: "Hide Layer 1" }));
      expect(store.getState().threadLayers[0].visible).toBe(false);

      fireEvent.click(screen.getByRole("button", { name: "Lock Layer 1" }));
      expect(store.getState().threadLayers[0].locked).toBe(true);

      fireEvent.doubleClick(screen.getByText("Layer 1"));
      const input = screen.getByDisplayValue("Layer 1");
      fireEvent.change(input, { target: { value: "Thread A" } });
      fireEvent.keyDown(input, { key: "Enter" });
      expect(store.getState().threadLayers[0].name).toBe("Thread A");

      store.setActiveThreadLayer(secondId);
      fireEvent.click(screen.getByRole("button", { name: "Duplicate" }));
      expect(store.getState().threadLayers).toHaveLength(3);

      fireEvent.click(screen.getByRole("button", { name: "Move layer up" }));
      expect(store.getState().threadLayers.map((l) => l.id)[0]).toBe(secondId);

      fireEvent.click(screen.getByRole("button", { name: "New Layer" }));
      expect(store.getState().threadLayers).toHaveLength(4);

      fireEvent.click(screen.getByRole("button", { name: "Delete" }));
      expect(store.getState().threadLayers).toHaveLength(3);
    });
  });
});
