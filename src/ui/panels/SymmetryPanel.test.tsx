import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EditorStore } from "@application/document";
import { SymmetryPanel } from "./SymmetryPanel";

describe("SymmetryPanel", () => {
  it("with no Pin Path selected, clicking an option changes the drawing default symmetry", () => {
    const store = new EditorStore();
    render(<SymmetryPanel store={store} />);

    fireEvent.click(screen.getByRole("button", { name: "Horiz" }));

    expect(store.getState().symmetryDefaults.type).toBe("horizontal");
  });

  it("with a Pin Path selected, clicking an option changes only that path's symmetry", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    const pathId = store.addPinPath(layerId, { type: "circle", center: { x: 0, y: 0 }, radius: 5 })!;
    store.select({ type: "pinPaths", refs: [{ layerId, pathId }] });

    render(<SymmetryPanel store={store} />);
    fireEvent.click(screen.getByRole("button", { name: "Vert" }));

    expect(store.getState().pinLayers[0].pinPaths[0].symmetry.type).toBe("vertical");
    expect(store.getState().symmetryDefaults.type).toBe("none");
  });

  it("clicking Both and None also switch the mode", () => {
    const store = new EditorStore();
    render(<SymmetryPanel store={store} />);

    fireEvent.click(screen.getByRole("button", { name: "Both" }));
    expect(store.getState().symmetryDefaults.type).toBe("both");

    fireEvent.click(screen.getByRole("button", { name: "None" }));
    expect(store.getState().symmetryDefaults.type).toBe("none");
  });

  it("selecting Radial reveals interval/centre fields, hidden otherwise", () => {
    const store = new EditorStore();
    render(<SymmetryPanel store={store} />);
    expect(screen.queryByLabelText("Interval (°)")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Radial" }));

    expect(screen.getByLabelText("Interval (°)")).toBeInTheDocument();
    expect(screen.getByLabelText("Centre X")).toBeInTheDocument();
    expect(screen.getByLabelText("Centre Y")).toBeInTheDocument();
  });

  it("editing interval and centre X/Y writes through the store", () => {
    const store = new EditorStore();
    render(<SymmetryPanel store={store} />);
    fireEvent.click(screen.getByRole("button", { name: "Radial" }));

    fireEvent.change(screen.getByLabelText("Interval (°)"), { target: { value: "90" } });
    expect(store.getState().symmetryDefaults).toMatchObject({ type: "radial", intervalDegrees: 90 });

    fireEvent.change(screen.getByLabelText("Centre X"), { target: { value: "3" } });
    expect(store.getState().symmetryDefaults).toMatchObject({ centre: { x: 3, y: 0 } });

    fireEvent.change(screen.getByLabelText("Centre Y"), { target: { value: "7" } });
    expect(store.getState().symmetryDefaults).toMatchObject({ centre: { x: 3, y: 7 } });
  });
});
