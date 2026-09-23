import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EditorStore } from "@application/document";
import { SelectToolbar } from "./SelectToolbar";

describe("SelectToolbar", () => {
  it("clicking the Pins end label sets the granularity", () => {
    const store = new EditorStore();
    render(<SelectToolbar store={store} />);

    expect(store.getState().selectGranularity).toBe("path");
    fireEvent.click(screen.getByRole("button", { name: "Pins" }));
    expect(store.getState().selectGranularity).toBe("pins");
  });

  it("clicking the switch track toggles the granularity and reflects aria-checked", () => {
    const store = new EditorStore();
    render(<SelectToolbar store={store} />);

    const track = screen.getByRole("switch");
    expect(track).toHaveAttribute("aria-checked", "false");
    fireEvent.click(track);
    expect(store.getState().selectGranularity).toBe("pins");
    expect(track).toHaveAttribute("aria-checked", "true");
    fireEvent.click(track);
    expect(store.getState().selectGranularity).toBe("path");
  });

  it("clicking the Pin Path end label always sets it back, even when already on Pin Path", () => {
    const store = new EditorStore();
    render(<SelectToolbar store={store} />);

    fireEvent.click(screen.getByRole("button", { name: "Pin Path" }));
    expect(store.getState().selectGranularity).toBe("path");
  });

  it("the Merge button is disabled below 2 selected members and enabled at/above it", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    const pathIdA = store.addPinPath(layerId, { type: "circle", center: { x: 0, y: 0 }, radius: 5 })!;
    const pathIdB = store.addPinPath(layerId, { type: "circle", center: { x: 10, y: 0 }, radius: 5 })!;
    store.select({ type: "pinPaths", refs: [{ layerId, pathId: pathIdA }] });

    const { rerender } = render(<SelectToolbar store={store} />);
    expect(screen.getByRole("button", { name: "Merge" })).toBeDisabled();

    store.select({ type: "pinPaths", refs: [{ layerId, pathId: pathIdA }, { layerId, pathId: pathIdB }] });
    rerender(<SelectToolbar store={store} />);
    expect(screen.getByRole("button", { name: "Merge" })).not.toBeDisabled();
  });

  it("clicking Merge fires commitSelectionMerge on the store", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    const pathIdA = store.addPinPath(layerId, { type: "circle", center: { x: 0, y: 0 }, radius: 5 })!;
    const pathIdB = store.addPinPath(layerId, { type: "circle", center: { x: 10, y: 0 }, radius: 5 })!;
    store.select({ type: "pinPaths", refs: [{ layerId, pathId: pathIdA }, { layerId, pathId: pathIdB }] });

    render(<SelectToolbar store={store} />);
    fireEvent.click(screen.getByRole("button", { name: "Merge" }));

    expect(store.getState().pinLayers[0].pinPaths).toHaveLength(1); // combined into one
  });

  it("clicking a tool button sets it as the active Select tool", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    const pathId = store.addPinPath(layerId, { type: "circle", center: { x: 0, y: 0 }, radius: 5 })!;
    store.select({ type: "pinPaths", refs: [{ layerId, pathId }] });
    render(<SelectToolbar store={store} />);

    fireEvent.click(screen.getByRole("button", { name: "Move" }));

    expect(store.getState().selectTool).toBe("move");
  });

  it("Move/Rotation/Scale tool buttons are disabled with no selection", () => {
    const store = new EditorStore();
    render(<SelectToolbar store={store} />);
    expect(screen.getByRole("button", { name: "Move" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Rotation" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Scale" })).toBeDisabled();
  });
});
