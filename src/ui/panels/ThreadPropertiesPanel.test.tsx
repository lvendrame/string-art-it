import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EditorStore } from "../../application/document";
import { ThreadPropertiesPanel } from "./ThreadPropertiesPanel";

function seedThread(store: EditorStore) {
  const layerId = store.getState().pinLayers[0].id;
  store.addPinPath(layerId, { type: "line", start: { x: 0, y: 0 }, end: { x: 10, y: 0 } });
  const pins = store.getState().pinLayers[0].pinPaths[0].pins;
  const threadLayerId = store.getState().threadLayers[0].id;
  store.extendThreadDraft(pins[0].id);
  store.finishThreadDraftWithSegment(threadLayerId, pins[1].id);
  const threadPathId = store.getState().threadLayers[0].threadPaths[0].id;
  return { threadLayerId, threadPathId };
}

// docs/specs/27-thread-select-tool.md — dual-context, same pattern as
// PinPropertiesPanel.test.tsx: no separate "empty" panel anymore, so every test just
// asserts which value set (defaults vs. the selected Thread Path) the fields show/edit.
describe("ThreadPropertiesPanel", () => {
  it("with no Thread Path selected, edits change the drawing defaults", () => {
    const store = new EditorStore();
    render(<ThreadPropertiesPanel store={store} />);

    expect(screen.getByText("Thread Properties (defaults)")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Width"), { target: { value: "3" } });

    expect(store.getState().threadDefaults.width).toBe(3);
  });

  it("with a Thread Path selected, edits change only that thread, undoably", () => {
    const store = new EditorStore();
    const { threadLayerId, threadPathId } = seedThread(store);
    store.select({ type: "threadPath", layerId: threadLayerId, pathId: threadPathId });

    const { container } = render(<ThreadPropertiesPanel store={store} />);
    expect(screen.getByText("Thread Properties (selected)")).toBeInTheDocument();
    const swatch = container.querySelector('input[type="color"]')!;
    fireEvent.change(swatch, { target: { value: "#123456" } });

    expect(store.getState().threadLayers[0].threadPaths[0].colours[0]).toBe("#123456");
    store.undo();
    expect(store.getState().threadLayers[0].threadPaths[0].colours[0]).not.toBe("#123456");
  });

  it("changing width updates only the selected Thread Path, not the drawing defaults", () => {
    const store = new EditorStore();
    const { threadLayerId, threadPathId } = seedThread(store);
    const defaultsBefore = store.getState().threadDefaults.width;
    store.select({ type: "threadPath", layerId: threadLayerId, pathId: threadPathId });

    render(<ThreadPropertiesPanel store={store} />);
    fireEvent.change(screen.getByLabelText("Width"), { target: { value: "3" } });

    expect(store.getState().threadLayers[0].threadPaths[0].width).toBe(3);
    expect(store.getState().threadDefaults.width).toBe(defaultsBefore);
  });

  // Regression test: this is the exact bug reported — the colour-count buttons
  // (1/2/3) were only ever shown in ThreadToolbar's drawing-defaults block, so a
  // selected Thread Path's own colour count could never be changed.
  it("the colour-count buttons change the SELECTED Thread Path's colour count", () => {
    const store = new EditorStore();
    const { threadLayerId, threadPathId } = seedThread(store);
    store.select({ type: "threadPath", layerId: threadLayerId, pathId: threadPathId });
    expect(store.getState().threadLayers[0].threadPaths[0].colours).toHaveLength(1);

    render(<ThreadPropertiesPanel store={store} />);
    fireEvent.click(screen.getByRole("button", { name: "3" }));

    expect(store.getState().threadLayers[0].threadPaths[0].colours).toHaveLength(3);
  });

  it("only one set of colour/width fields is ever rendered (no duplication)", () => {
    const store = new EditorStore();
    const { threadLayerId, threadPathId } = seedThread(store);
    store.select({ type: "threadPath", layerId: threadLayerId, pathId: threadPathId });

    render(<ThreadPropertiesPanel store={store} />);

    expect(screen.getAllByLabelText("Width")).toHaveLength(1);
  });
});
