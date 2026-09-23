import { render, screen, fireEvent, renderHook } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { EditorStore } from "@application/document";
import { Canvas } from "./Canvas";
import { useTwoPinSequenceDrawing } from "./useTwoPinSequenceDrawing";

beforeAll(() => {
  Element.prototype.getBoundingClientRect = () =>
    ({ left: 0, top: 0, right: 720, bottom: 640, width: 720, height: 640, x: 0, y: 0, toJSON() {} }) as DOMRect;
});

// zoom 4, panOrigin (-40,-40): doc(x,y) -> screen(x*4+160, y*4+160)
function screenOf(p: { x: number; y: number }) {
  return { clientX: p.x * 4 + 160, clientY: p.y * 4 + 160 };
}

function seedZigzag(tool: "zigzag" | "parabolic" = "zigzag") {
  const store = new EditorStore();
  const layerId = store.getState().pinLayers[0].id;
  store.addPinPath(layerId, { type: "circle", center: { x: 0, y: 0 }, radius: 8 });
  store.setMode("thread");
  store.setThreadTool(tool);
  const pins = store.getState().pinLayers[0].pinPaths[0].pins;
  return { store, pins };
}

describe("Canvas — Zig-zag/Parabolic two-pin drawing", () => {
  it("hovering before any click surfaces the nearest pin as a Candidate", () => {
    const { store, pins } = seedZigzag();
    const { container } = render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    fireEvent.mouseMove(svg, screenOf(pins[0]));

    expect(container.textContent).toContain(`Pin ${pins[0].id}`);
    expect(container.textContent).toContain("click to start");
  });

  it("clicking a pin starts the draft and the status bar names it as the origin", () => {
    const { store, pins } = seedZigzag();
    const { container } = render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    fireEvent.mouseDown(svg, screenOf(pins[0]));

    expect(store.getState().twoPinDraft).toMatchObject({ firstPinId: pins[0].id, candidates: [] });
    expect(container.textContent).toContain(`From Pin ${pins[0].id}`);
    expect(container.textContent).toContain("click the second pin");
  });

  it("hovering a second pin mid-draft shows it in the status bar", () => {
    const { store, pins } = seedZigzag();
    const { container } = render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    fireEvent.mouseDown(svg, screenOf(pins[0]));
    fireEvent.mouseMove(svg, screenOf(pins[4]));

    expect(container.textContent).toContain(`From Pin ${pins[0].id} → ${pins[4].id}`);
  });

  it("clicking an unambiguous second pin commits immediately, clearing the draft", () => {
    const { store, pins } = seedZigzag();
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    fireEvent.mouseDown(svg, screenOf(pins[0]));
    // Diametrically opposite pin: forward arc == backward arc, so
    // computeSamePathCandidates collapses to exactly one candidate (see
    // twoPinSequence.test.ts's identical case) — commits on click 2, no 3rd click.
    fireEvent.mouseDown(svg, screenOf(pins[Math.floor(pins.length / 2)]));

    expect(store.getState().twoPinDraft).toBeNull();
    expect(store.getState().threadLayers[0].threadPaths).toHaveLength(1);
  });

  it("clicking an ambiguous second pin populates candidates and the status bar counts them", () => {
    const { store, pins } = seedZigzag();
    const { container } = render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    fireEvent.mouseDown(svg, screenOf(pins[0]));
    fireEvent.mouseDown(svg, screenOf(pins[2])); // short arc vs. long arc: 2 candidates

    const draft = store.getState().twoPinDraft!;
    expect(draft.candidates.length).toBeGreaterThan(1);
    expect(container.textContent).toContain(`${draft.candidates.length} candidates`);
  });

  it("moving the cursor near a different candidate's far endpoint re-previews it", () => {
    const { store, pins } = seedZigzag();
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    fireEvent.mouseDown(svg, screenOf(pins[0]));
    fireEvent.mouseDown(svg, screenOf(pins[2]));
    const draft = store.getState().twoPinDraft!;
    expect(draft.candidates.length).toBeGreaterThan(1);

    // Hover near the far endpoint of whichever candidate ISN'T currently chosen.
    const otherIndex = draft.chosenIndex === 0 ? 1 : 0;
    const otherSeq = draft.candidates[otherIndex];
    const farPinId = otherSeq[otherSeq.length - 1];
    const farPin = pins.find((p) => p.id === farPinId)!;

    fireEvent.mouseMove(svg, screenOf(farPin));

    expect(store.getState().twoPinDraft!.chosenIndex).toBe(otherIndex);

    // Hovering the SAME spot again: recompute picks the same index, so nothing changes.
    fireEvent.mouseMove(svg, screenOf(farPin));
    expect(store.getState().twoPinDraft!.chosenIndex).toBe(otherIndex);

    // Hover back near the original candidate's far endpoint — its own iteration (index
    // 0 in the loop) is checked first and always sets bestDist, then the other
    // candidate's endpoint (checked afterward) is now the FARTHER one, exercising the
    // "not closer, skip" branch instead of "closer, take it".
    const originalIndex = otherIndex === 0 ? 1 : 0;
    const originalSeq = draft.candidates[originalIndex];
    const originalFarPin = pins.find((p) => p.id === originalSeq[originalSeq.length - 1])!;
    fireEvent.mouseMove(svg, screenOf(originalFarPin));
    expect(store.getState().twoPinDraft!.chosenIndex).toBe(originalIndex);
  });

  it("a 3rd click anywhere confirms the previewed candidate", () => {
    const { store, pins } = seedZigzag();
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    fireEvent.mouseDown(svg, screenOf(pins[0]));
    fireEvent.mouseDown(svg, screenOf(pins[2]));
    expect(store.getState().twoPinDraft!.candidates.length).toBeGreaterThan(1);

    fireEvent.mouseDown(svg, { clientX: 600, clientY: 600 }); // free position, not on a pin

    expect(store.getState().twoPinDraft).toBeNull();
    expect(store.getState().threadLayers[0].threadPaths).toHaveLength(1);
  });

  it("clicking empty canvas before any pin is picked is a no-op", () => {
    const { store } = seedZigzag();
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    fireEvent.mouseDown(svg, { clientX: 600, clientY: 600 });

    expect(store.getState().twoPinDraft).toBeNull();
  });

  it("Escape cancels an in-progress draft", () => {
    const { store, pins } = seedZigzag();
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    fireEvent.mouseDown(svg, screenOf(pins[0]));
    expect(store.getState().twoPinDraft).not.toBeNull();

    fireEvent.keyDown(window, { key: "Escape" });

    expect(store.getState().twoPinDraft).toBeNull();
  });

  it("ArrowLeft retracts an in-progress draft", () => {
    const { store, pins } = seedZigzag();
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    fireEvent.mouseDown(svg, screenOf(pins[0]));
    expect(store.getState().twoPinDraft).not.toBeNull();

    fireEvent.keyDown(window, { key: "ArrowLeft" });

    expect(store.getState().twoPinDraft).toBeNull();
  });

  it("Escape/ArrowLeft do nothing outside Thread mode's Zig-zag/Parabolic tool", () => {
    const { store, pins } = seedZigzag();
    store.setThreadTool("draw");
    store.startTwoPinDraft("zigzag", pins[0].id); // force a draft to exist despite the tool switch
    render(<Canvas store={store} />);

    fireEvent.keyDown(window, { key: "Escape" });

    expect(store.getState().twoPinDraft).not.toBeNull();
  });

  it("works identically for the Parabolic tool", () => {
    const { store, pins } = seedZigzag("parabolic");
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    fireEvent.mouseDown(svg, screenOf(pins[0]));

    expect(store.getState().twoPinDraft).toMatchObject({ tool: "parabolic", firstPinId: pins[0].id });
  });

  it("a non-Escape/ArrowLeft key during an in-progress draft does nothing", () => {
    const { store, pins } = seedZigzag();
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    fireEvent.mouseDown(svg, screenOf(pins[0]));
    const before = store.getState().twoPinDraft;

    fireEvent.keyDown(window, { key: "a" });

    expect(store.getState().twoPinDraft).toEqual(before);
  });

  it("hovering empty space before any pin is picked clears the hover candidate", () => {
    const { store, pins } = seedZigzag();
    const { container } = render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    fireEvent.mouseMove(svg, screenOf(pins[0]));
    expect(container.textContent).toContain(`Pin ${pins[0].id}`);

    fireEvent.mouseMove(svg, { clientX: 600, clientY: 600 });

    expect(container.textContent).not.toContain(`Pin ${pins[0].id}`);
  });
});

describe("useTwoPinSequenceDrawing — hook-level edge cases", () => {
  it("handleMouseDown is a no-op when the active Thread tool isn't Zig-zag/Parabolic", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    store.addPinPath(layerId, { type: "circle", center: { x: 0, y: 0 }, radius: 8 });
    store.setMode("thread");
    store.setThreadTool("draw"); // not a two-pin tool
    const state = store.getState();
    const spy = vi.spyOn(store, "startTwoPinDraft");

    const { result } = renderHook(() => useTwoPinSequenceDrawing(store, state, store.getState().threadLayers[0].id));
    result.current.handleMouseDown(state.pinLayers[0].pinPaths[0].pins[0], 5);

    expect(spy).not.toHaveBeenCalled();
  });

  it("handleMouseMove skips a candidate whose far-endpoint pin id no longer resolves", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    store.addPinPath(layerId, { type: "circle", center: { x: 0, y: 0 }, radius: 8 });
    const pins = store.getState().pinLayers[0].pinPaths[0].pins;
    const threadLayerId = store.getState().threadLayers[0].id;
    const state = {
      ...store.getState(),
      twoPinDraft: {
        tool: "zigzag" as const,
        firstPinId: pins[0].id,
        candidates: [["missing-pin-id"], [pins[0].id, pins[1].id]],
        chosenIndex: 0,
      },
    };

    const { result } = renderHook(() => useTwoPinSequenceDrawing(store, state, threadLayerId));

    expect(() => result.current.handleMouseMove(pins[1], 5)).not.toThrow();
  });
});
