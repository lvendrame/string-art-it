import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EditorStore, pinPathStatistics, type PinPathGeometry } from "../../../application/document";
import { SelectionPanel } from "./SelectionPanel";

// docs/specs/29-text-pin-path.md — buildTextGeometry is the one place these tests would
// otherwise need a real font fetch+parse (already covered at the infrastructure layer,
// src/infrastructure/fonts/*.test.ts); mocking it isolates what THIS panel is
// responsible for: calling it with the right field values, then committing the result.
vi.mock("../../text/buildTextGeometry", () => ({
  buildTextGeometry: vi.fn(async (origin, text, fontId, weight, italic, size, letterSpacing) => ({
    type: "text",
    origin,
    text,
    fontId,
    weight,
    italic,
    size,
    letterSpacing,
    rotation: 0,
    contours: text.length > 0 ? [[{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }]] : [],
  })),
}));

function textGeometry(overrides: Partial<Extract<PinPathGeometry, { type: "text" }>> = {}): PinPathGeometry {
  return {
    type: "text",
    origin: { x: 0, y: 0 },
    text: "Hi",
    fontId: "pt-sans",
    weight: "regular",
    italic: false,
    size: 5,
    letterSpacing: 0,
    rotation: 0,
    contours: [[{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }]],
    ...overrides,
  };
}

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

  // docs/specs/17-statistics.md figures, surfaced inline for Edit-mode Pin Path selection.
  it("with one Pin Path selected, shows a stats box with pins/actual gap/perimeter", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    const pathId = store.addPinPath(layerId, { type: "circle", center: { x: 0, y: 0 }, radius: 31 / (2 * Math.PI) })!;
    store.select({ type: "pinPaths", refs: [{ layerId, pathId }] });
    store.setPinProperty({ spacing: 2 });
    const stats = pinPathStatistics(store.getState().pinLayers[0].pinPaths[0]);

    render(<SelectionPanel store={store} />);

    const statsBox = screen.getByText("Stats").parentElement!;
    expect(within(statsBox).getByText("Pins").nextSibling).toHaveTextContent(String(stats.pins));
    expect(within(statsBox).getByText("Actual gap").nextSibling).toHaveTextContent(`${stats.actualSpacing.toFixed(2)} cm`);
    expect(within(statsBox).getByText("Path perimeter").nextSibling).toHaveTextContent(`${stats.perimeterCm.toFixed(2)} cm`);
  });

  it("with multiple Pin Paths selected, the stats box sums pins/perimeter and omits Actual gap", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    const pathIdA = store.addPinPath(layerId, { type: "circle", center: { x: 0, y: 0 }, radius: 5 })!;
    const pathIdB = store.addPinPath(layerId, { type: "circle", center: { x: 20, y: 0 }, radius: 3 })!;
    store.select({ type: "pinPaths", refs: [{ layerId, pathId: pathIdA }, { layerId, pathId: pathIdB }] });
    const paths = store.getState().pinLayers[0].pinPaths;
    const expectedPins = paths.reduce((sum, p) => sum + p.pins.length, 0);
    const expectedPerimeter = paths.reduce((sum, p) => sum + pinPathStatistics(p).perimeterCm, 0);

    render(<SelectionPanel store={store} />);

    const statsBox = screen.getByText("Stats").parentElement!;
    expect(within(statsBox).getByText("Pins").nextSibling).toHaveTextContent(String(expectedPins));
    expect(within(statsBox).getByText("Path perimeter").nextSibling).toHaveTextContent(`${expectedPerimeter.toFixed(2)} cm`);
    expect(within(statsBox).queryByText("Actual gap")).not.toBeInTheDocument();
  });

  it("shows no stats box when nothing or only pins are selected", () => {
    const store = new EditorStore();
    render(<SelectionPanel store={store} />);
    expect(screen.queryByText("Stats")).not.toBeInTheDocument();
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

  // docs/specs/29-text-pin-path.md
  describe("text Pin Path", () => {
    it("shows the Font/Weight/Italic/Size/Letter spacing/Text field group", () => {
      const store = new EditorStore();
      const layerId = store.getState().pinLayers[0].id;
      const pathId = store.addPinPath(layerId, textGeometry())!;
      store.select({ type: "pinPaths", refs: [{ layerId, pathId }] });

      render(<SelectionPanel store={store} />);

      expect(screen.getByLabelText("Font")).toBeInTheDocument();
      expect(screen.getByLabelText("Weight")).toBeInTheDocument();
      expect(screen.getByLabelText("Italic")).toBeInTheDocument();
      expect(screen.getByLabelText("Size (cm)")).toBeInTheDocument();
      expect(screen.getByLabelText("Letter spacing (cm)")).toBeInTheDocument();
      expect(screen.getByLabelText("Text")).toHaveValue("Hi");
      // No numeric-geometry fields from any other shape leak into this branch.
      expect(screen.queryByLabelText("Radius")).not.toBeInTheDocument();
    });

    it("typing in the Text field regenerates and commits the geometry", async () => {
      const store = new EditorStore();
      const layerId = store.getState().pinLayers[0].id;
      const pathId = store.addPinPath(layerId, textGeometry({ text: "H" }))!;
      store.select({ type: "pinPaths", refs: [{ layerId, pathId }] });

      render(<SelectionPanel store={store} />);
      fireEvent.change(screen.getByLabelText("Text"), { target: { value: "Hi!" } });

      await vi.waitFor(() => {
        const geometry = store.getState().pinLayers[0].pinPaths[0].geometry;
        if (geometry.type !== "text") throw new Error("expected text geometry");
        expect(geometry.text).toBe("Hi!");
      });
    });

    it("changing Weight commits the new weight without touching the text content", async () => {
      const store = new EditorStore();
      const layerId = store.getState().pinLayers[0].id;
      const pathId = store.addPinPath(layerId, textGeometry())!;
      store.select({ type: "pinPaths", refs: [{ layerId, pathId }] });

      render(<SelectionPanel store={store} />);
      fireEvent.change(screen.getByLabelText("Weight"), { target: { value: "bold" } });

      await vi.waitFor(() => {
        const geometry = store.getState().pinLayers[0].pinPaths[0].geometry;
        if (geometry.type !== "text") throw new Error("expected text geometry");
        expect(geometry.weight).toBe("bold");
        expect(geometry.text).toBe("Hi");
      });
    });

    it("Italic is disabled for a font with no italic file (e.g. a script font)", () => {
      const store = new EditorStore();
      const layerId = store.getState().pinLayers[0].id;
      const pathId = store.addPinPath(layerId, textGeometry({ fontId: "pacifico" }))!;
      store.select({ type: "pinPaths", refs: [{ layerId, pathId }] });

      render(<SelectionPanel store={store} />);

      expect(screen.getByLabelText("Italic")).toBeDisabled();
    });

    it("the Text field is the first field in the group, before Font", () => {
      const store = new EditorStore();
      const layerId = store.getState().pinLayers[0].id;
      const pathId = store.addPinPath(layerId, textGeometry())!;
      store.select({ type: "pinPaths", refs: [{ layerId, pathId }] });

      const { container } = render(<SelectionPanel store={store} />);

      // Each field is `<label>{label text}<input/select/></label>` — read just the
      // label's own leading text node, not the full textContent (which for Font/Weight
      // would also include every <option>'s text).
      const fieldLabels = Array.from(container.querySelectorAll("label")).map((label) => label.childNodes[0].textContent);
      expect(fieldLabels).toEqual(["Pin distance", "Text", "Font", "Weight", "Italic", "Size (cm)", "Letter spacing (cm)"]);
    });

    it("selecting a Text Pin Path focuses the Text field, ready to type into immediately", () => {
      const store = new EditorStore();
      const layerId = store.getState().pinLayers[0].id;
      const pathId = store.addPinPath(layerId, textGeometry())!;
      store.select({ type: "pinPaths", refs: [{ layerId, pathId }] });

      render(<SelectionPanel store={store} />);

      expect(screen.getByLabelText("Text")).toHaveFocus();
    });

    it("does not steal focus back on every keystroke — only on an actual selection change", async () => {
      const store = new EditorStore();
      const layerId = store.getState().pinLayers[0].id;
      const pathId = store.addPinPath(layerId, textGeometry())!;
      store.select({ type: "pinPaths", refs: [{ layerId, pathId }] });

      render(<SelectionPanel store={store} />);
      const input = screen.getByLabelText("Text");
      input.blur();
      expect(input).not.toHaveFocus();

      fireEvent.change(input, { target: { value: "Hi!" } });
      await vi.waitFor(() => {
        const geometry = store.getState().pinLayers[0].pinPaths[0].geometry;
        if (geometry.type !== "text") throw new Error("expected text geometry");
        expect(geometry.text).toBe("Hi!");
      });

      expect(input).not.toHaveFocus();
    });

    it("an empty typed string regenerates to zero contours without throwing", async () => {
      const store = new EditorStore();
      const layerId = store.getState().pinLayers[0].id;
      const pathId = store.addPinPath(layerId, textGeometry())!;
      store.select({ type: "pinPaths", refs: [{ layerId, pathId }] });

      render(<SelectionPanel store={store} />);
      fireEvent.change(screen.getByLabelText("Text"), { target: { value: "" } });

      await vi.waitFor(() => {
        const path = store.getState().pinLayers[0].pinPaths[0];
        expect(path.pins).toHaveLength(0);
      });
    });
  });
});
