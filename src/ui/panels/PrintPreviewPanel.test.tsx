import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EditorStore } from "../../application/document";
import { PrintPreviewPanel } from "./PrintPreviewPanel";

describe("PrintPreviewPanel", () => {
  it("toggling an element checkbox updates print settings independently of editor state", () => {
    const store = new EditorStore();
    expect(store.getState().printSettings.elements.threads).toBe(false); // default
    render(<PrintPreviewPanel store={store} onClose={() => {}} />);

    fireEvent.click(screen.getByLabelText("Threads"));

    expect(store.getState().printSettings.elements.threads).toBe(true);
  });

  it("switching scale mode to custom reveals a ratio input", () => {
    const store = new EditorStore();
    render(<PrintPreviewPanel store={store} onClose={() => {}} />);

    fireEvent.click(screen.getByLabelText("Custom scale"));

    expect(store.getState().printSettings.scale.mode).toBe("custom");
  });

  it("changing paper size updates settings", () => {
    const store = new EditorStore();
    render(<PrintPreviewPanel store={store} onClose={() => {}} />);

    fireEvent.change(screen.getByDisplayValue("A4"), { target: { value: "A3" } });

    expect(store.getState().printSettings.paper.size).toBe("A3");
  });

  it("close button invokes onClose", () => {
    const store = new EditorStore();
    const onClose = vi.fn();
    render(<PrintPreviewPanel store={store} onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("calibration flow derives and stores a correction factor", () => {
    const store = new EditorStore();
    render(<PrintPreviewPanel store={store} onClose={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: "Print calibration test" }));
    fireEvent.change(screen.getByLabelText("Measured (cm)"), { target: { value: "9.8" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    expect(store.getState().printSettings.calibration.correctionFactor).toBeCloseTo(10 / 9.8, 4);
  });

  it("enabling tiling reveals overlap and marker controls", () => {
    const store = new EditorStore();
    render(<PrintPreviewPanel store={store} onClose={() => {}} />);

    fireEvent.click(screen.getByLabelText("Enable tiling across multiple pages"));

    expect(store.getState().printSettings.tiling.enabled).toBe(true);
    expect(screen.getByLabelText("Overlap (cm)")).toBeInTheDocument();
    expect(screen.getByLabelText("Trim marks")).toBeInTheDocument();
  });

  it("a board larger than one page renders multiple tiled pages", () => {
    const store = new EditorStore();
    store.setBoardDimensions({ diameter: 200 }); // much larger than any paper size
    store.setPrintSettings({ scale: { mode: "1:1", customRatio: 1 } });

    render(<PrintPreviewPanel store={store} onClose={() => {}} />);
    fireEvent.click(screen.getByLabelText("Enable tiling across multiple pages"));

    expect(screen.getByText(/pages \(/)).toBeInTheDocument();
  });
});
