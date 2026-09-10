import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { computeEffectiveScale, EditorStore, paperDimensionsCm } from "../../application/document";
import { CSS_PIXELS_PER_CM } from "../../domain/transforms";
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

  it("prints mirrored (symmetry-generated) pins, and a Thread connecting to one", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    store.setSymmetryConfig({ type: "vertical", axis: { x: 50, y: 0 } });
    store.addPinPath(layerId, { type: "line", start: { x: 10, y: 10 }, end: { x: 30, y: 10 } });
    const pins = store.getState().pinLayers[0].pinPaths[0].pins;
    const threadLayerId = store.getState().threadLayers[0].id;
    const mirroredId = `${pins[0].id}~mirror-0`;
    store.extendThreadDraft(mirroredId);
    store.finishThreadDraftWithSegment(threadLayerId, `${pins[1].id}~mirror-0`);
    store.setPrintSettings({ elements: { ...store.getState().printSettings.elements, threads: true } });

    render(<PrintPreviewPanel store={store} onClose={() => {}} />);

    const dots = document.querySelectorAll("circle[fill='black']");
    expect(dots.length).toBeGreaterThan(pins.length); // real pins + their mirrored copies

    // The printed Thread Path's `d` must carry both endpoints (M + L), not collapse
    // to a single point because a mirrored pin id failed to resolve.
    const threadD = Array.from(document.querySelectorAll("path")).map((p) => p.getAttribute("d") ?? "").find((d) => d.includes(" L "));
    expect(threadD).toBeDefined();
  });

  it("pin dots and numbers stay legible on paper even when fit-to-page shrinks a large board", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    store.setBoardDimensions({ diameter: 200 }); // large board -> a tiny fit-to-page effectiveScale
    store.addPinPath(layerId, { type: "circle", center: { x: 0, y: 0 }, radius: 90 });
    store.setPrintSettings({ elements: { ...store.getState().printSettings.elements, pinNumbers: true } });

    render(<PrintPreviewPanel store={store} onClose={() => {}} />);

    const { board, printSettings } = store.getState();
    const boardSize = { width: board.dimensions.diameter!, height: board.dimensions.diameter! };
    const paperSize = paperDimensionsCm(printSettings.paper);
    const effectiveScale = computeEffectiveScale(printSettings.scale, boardSize, paperSize, 1, printSettings.calibration.correctionFactor);
    const groupScale = effectiveScale * CSS_PIXELS_PER_CM;
    expect(effectiveScale).toBeLessThan(0.15); // sanity: this board really is being shrunk hard to fit the page

    const dot = document.querySelector("circle[fill='black']");
    const number = document.querySelector("text");
    expect(dot).not.toBeNull();
    expect(number).not.toBeNull();
    expect(Number(dot!.getAttribute("r")) * groupScale).toBeGreaterThanOrEqual(1); // stays a visible dot on paper
    expect(Number(number!.getAttribute("font-size")) * groupScale).toBeGreaterThanOrEqual(6); // stays a readable digit
  });

  it("no element id is duplicated between the on-screen preview and the print portal, so clip-path url(#id) references stay unambiguous", () => {
    const store = new EditorStore();
    render(<PrintPreviewPanel store={store} onClose={() => {}} />);

    const ids = Array.from(document.querySelectorAll("[id]")).map((el) => el.id);
    const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);

    expect(duplicates).toEqual([]);
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
