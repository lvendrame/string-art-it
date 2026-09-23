import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EditorStore } from "@application/document";
import { PinPropertiesPanel } from "./PinPropertiesPanel";

describe("PinPropertiesPanel", () => {
  it("with no Pin Path selected, shows and edits the drawing defaults", () => {
    const store = new EditorStore();
    render(<PinPropertiesPanel store={store} />);

    expect(screen.getByText("Pin Properties (defaults)")).toBeInTheDocument();
    expect(screen.queryByText("Actual gap")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Spacing (cm)"), { target: { value: "2" } });
    expect(store.getState().pinDefaults.spacing).toBe(2);
  });

  it("with a Pin Path selected, shows and edits only that path, and shows the actual gap", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    const pathId = store.addPinPath(layerId, { type: "circle", center: { x: 0, y: 0 }, radius: 5 })!;
    store.select({ type: "pinPaths", refs: [{ layerId, pathId }] });

    render(<PinPropertiesPanel store={store} />);

    expect(screen.getByText("Pin Properties (selected)")).toBeInTheDocument();
    expect(screen.getByText("Actual gap")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Spacing (cm)"), { target: { value: "3" } });
    expect(store.getState().pinLayers[0].pinPaths[0].requestedSpacing).toBe(3);
  });

  it("editing diameter, colour, and guide visibility writes through the store", () => {
    const store = new EditorStore();
    render(<PinPropertiesPanel store={store} />);

    fireEvent.change(screen.getByLabelText("Diameter (mm)"), { target: { value: "5" } });
    expect(store.getState().pinDefaults.diameter).toBe(5);

    fireEvent.change(screen.getByLabelText("Colour"), { target: { value: "#123456" } });
    expect(store.getState().pinDefaults.colour).toBe("#123456");

    const before = store.getState().pinDefaults.guideVisible;
    fireEvent.click(screen.getByLabelText("Guide visible"));
    expect(store.getState().pinDefaults.guideVisible).toBe(!before);
  });
});
