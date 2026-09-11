import { act, render, screen, fireEvent } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";
import { EditorStore } from "../../application/document";
import { Canvas } from "./Canvas";

beforeAll(() => {
  Element.prototype.getBoundingClientRect = () =>
    ({ left: 0, top: 0, right: 720, bottom: 640, width: 720, height: 640, x: 0, y: 0, toJSON() {} }) as DOMRect;
});

// zoom 4, panOrigin (-40,-40): screen(200,200)->doc(10,10), screen(280,200)->doc(30,10)
function seedPinsAndEnterThreadMode() {
  const store = new EditorStore();
  const layerId = store.getState().pinLayers[0].id;
  store.addPinPath(layerId, { type: "line", start: { x: 10, y: 10 }, end: { x: 30, y: 10 } });
  store.setMode("thread");
  const pins = store.getState().pinLayers[0].pinPaths[0].pins;
  return { store, pins };
}

describe("Canvas — thread drawing interaction", () => {
  it("highlights the nearest pin as a Candidate before any thread insertion has started", () => {
    const { store } = seedPinsAndEnterThreadMode();
    expect(store.getState().threadDraft).toBeNull();
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    fireEvent.mouseMove(svg, { clientX: 200, clientY: 200 }); // pin at doc(10,10)

    expect(screen.getByTestId("pin-candidate")).toBeInTheDocument();
  });

  it("status bar shows the nearest pin number while hovering, before any insertion starts", () => {
    const { store } = seedPinsAndEnterThreadMode();
    const { container } = render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });
    const nearPinId = store.getState().pinLayers[0].pinPaths[0].pins[0].id;

    fireEvent.mouseMove(svg, { clientX: 200, clientY: 200 }); // hover pin at doc(10,10)

    expect(store.getState().threadDraft).toBeNull();
    expect(container.textContent).toContain(`Pin ${nearPinId}`);
  });

  it("status bar shows the origin pin number as soon as the thread insertion starts", () => {
    const { store } = seedPinsAndEnterThreadMode();
    const { container } = render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });
    const originPinId = store.getState().pinLayers[0].pinPaths[0].pins[0].id;

    fireEvent.mouseDown(svg, { clientX: 200, clientY: 200 }); // pin at doc(10,10), no mousemove yet

    expect(container.textContent).toContain(`From Pin ${originPinId}`);
  });

  it("clicking two pins commits a Thread Path via double-click", () => {
    const { store } = seedPinsAndEnterThreadMode();
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    fireEvent.mouseDown(svg, { clientX: 200, clientY: 200 }); // pin at doc(10,10)
    fireEvent.doubleClick(svg, { clientX: 280, clientY: 200 }); // pin at doc(30,10)

    const threads = store.getState().threadLayers[0].threadPaths;
    expect(threads).toHaveLength(1);
    expect(threads[0].pinIds).toHaveLength(2);
    expect(store.getState().threadDraft).toBeNull();
  });

  it("confirmed segments stay visible while drawing the rest of the thread", () => {
    const { store } = seedPinsAndEnterThreadMode();
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    fireEvent.mouseDown(svg, { clientX: 200, clientY: 200 }); // pin at doc(10,10) — origin only, no segment yet
    expect(screen.queryByTestId("thread-path")).not.toBeInTheDocument();

    fireEvent.mouseDown(svg, { clientX: 240, clientY: 200 }); // pin at doc(20,10) — first segment confirmed
    expect(screen.getByTestId("thread-path")).toBeInTheDocument(); // must NOT disappear

    fireEvent.mouseDown(svg, { clientX: 280, clientY: 200 }); // pin at doc(30,10) — second segment confirmed
    expect(screen.getByTestId("thread-path")).toBeInTheDocument(); // still must not disappear
    expect(store.getState().threadDraft?.pinIds).toHaveLength(3);
  });

  it("marks already-used pins in the current draft, and clears them once the thread finishes", () => {
    const { store } = seedPinsAndEnterThreadMode();
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    fireEvent.mouseDown(svg, { clientX: 200, clientY: 200 }); // pin 1 (origin only so far)
    fireEvent.mouseDown(svg, { clientX: 240, clientY: 200 }); // pin 2 -> pin 1 becomes "used"
    fireEvent.mouseDown(svg, { clientX: 280, clientY: 200 }); // pin 3 -> pin 2 also becomes "used"

    expect(screen.getAllByTestId("pin-used-in-thread")).toHaveLength(2);
    expect(screen.getByTestId("pin-active-origin")).toBeInTheDocument();

    fireEvent.contextMenu(svg); // finish at the last confirmed pin

    expect(store.getState().threadDraft).toBeNull();
    expect(screen.queryByTestId("pin-used-in-thread")).not.toBeInTheDocument();
  });

  it("right-click finishes without adding a pending segment", () => {
    const { store, pins } = seedPinsAndEnterThreadMode();
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    fireEvent.mouseDown(svg, { clientX: 200, clientY: 200 });
    act(() => store.extendThreadDraft(pins[pins.length - 1].id)); // far pin confirmed via store directly
    fireEvent.contextMenu(svg);

    const threads = store.getState().threadLayers[0].threadPaths;
    expect(threads).toHaveLength(1);
  });

  it("Escape with zero confirmed segments cancels outright", () => {
    const { store } = seedPinsAndEnterThreadMode();
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    fireEvent.mouseDown(svg, { clientX: 200, clientY: 200 }); // origin only
    fireEvent.keyDown(window, { key: "Escape" });

    expect(store.getState().threadDraft).toBeNull();
    expect(store.getState().threadLayers[0].threadPaths).toHaveLength(0);
  });

  it("Left Arrow removes the last inserted vertex, and ends the insertion once only the first remains", () => {
    const { store } = seedPinsAndEnterThreadMode();
    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    fireEvent.mouseDown(svg, { clientX: 200, clientY: 200 }); // pin 1
    fireEvent.mouseDown(svg, { clientX: 240, clientY: 200 }); // pin 2
    fireEvent.mouseDown(svg, { clientX: 280, clientY: 200 }); // pin 3
    expect(store.getState().threadDraft?.pinIds).toHaveLength(3);

    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(store.getState().threadDraft?.pinIds).toHaveLength(2);

    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(store.getState().threadDraft?.pinIds).toHaveLength(1);

    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(store.getState().threadDraft).toBeNull();
  });

  it("a mirrored (symmetry-generated) pin is a real click target for a Thread endpoint", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    store.setSymmetryConfig({ type: "vertical", axis: { x: 50, y: 0 } });
    store.addPinPath(layerId, { type: "line", start: { x: 10, y: 10 }, end: { x: 30, y: 10 } });
    store.setMode("thread");

    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    // Source pins at doc(10,10)/(30,10); mirrored across x=50 land at doc(90,10)/(70,10).
    fireEvent.mouseDown(svg, { clientX: 520, clientY: 200 }); // mirrored pin at doc(90,10)
    fireEvent.doubleClick(svg, { clientX: 440, clientY: 200 }); // mirrored pin at doc(70,10)

    const threads = store.getState().threadLayers[0].threadPaths;
    expect(threads).toHaveLength(1);
    expect(threads[0].pinIds.every((id) => id.includes("~mirror-"))).toBe(true);
  });

  it("hovering a mirrored pin outlines it as the candidate, and clicking it outlines it as the origin", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    store.setSymmetryConfig({ type: "vertical", axis: { x: 50, y: 0 } });
    store.addPinPath(layerId, { type: "line", start: { x: 10, y: 10 }, end: { x: 30, y: 10 } });
    store.setMode("thread");

    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });

    fireEvent.mouseDown(svg, { clientX: 200, clientY: 200 }); // start the draft at source pin doc(10,10)

    // Mirrored pin at doc(90,10), across x=50 from the source at doc(10,10).
    fireEvent.mouseMove(svg, { clientX: 520, clientY: 200 });
    expect(screen.getByTestId("pin-candidate")).toBeInTheDocument();

    fireEvent.mouseDown(svg, { clientX: 520, clientY: 200 }); // extend the draft to that mirrored pin
    expect(screen.getByTestId("pin-active-origin")).toBeInTheDocument();
  });

  it("thread eraser removes the whole Thread Path on click near a segment", () => {
    const { store, pins } = seedPinsAndEnterThreadMode();
    const threadLayerId = store.getState().threadLayers[0].id;
    store.extendThreadDraft(pins[0].id);
    store.finishThreadDraftWithSegment(threadLayerId, pins[pins.length - 1].id);
    store.setThreadTool("eraser");

    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });
    fireEvent.mouseDown(svg, { clientX: 240, clientY: 200 }); // midpoint of the segment, doc(20,10)

    expect(store.getState().threadLayers[0].threadPaths).toHaveLength(0);
  });

  it("segment eraser splits a longer thread into two surviving fragments on a middle segment", () => {
    const { store, pins } = seedPinsAndEnterThreadMode();
    const threadLayerId = store.getState().threadLayers[0].id;
    // A=pins[0] doc(10,10), B=pins[5] doc(15,10), C=pins[10] doc(20,10), D=pins[15] doc(25,10), E=pins[20] doc(30,10)
    store.extendThreadDraft(pins[0].id);
    store.extendThreadDraft(pins[5].id);
    store.extendThreadDraft(pins[10].id);
    store.extendThreadDraft(pins[15].id);
    store.finishThreadDraftWithSegment(threadLayerId, pins[20].id);
    store.setThreadTool("segment-eraser");

    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });
    fireEvent.mouseDown(svg, { clientX: 230, clientY: 200 }); // midpoint of segment B-C, doc(17.5,10)

    const threads = store.getState().threadLayers[0].threadPaths;
    expect(threads).toHaveLength(2);
    expect(threads[0].pinIds).toEqual([pins[0].id, pins[5].id]);
    expect(threads[1].pinIds).toEqual([pins[10].id, pins[15].id, pins[20].id]);
  });

  it("segment eraser on an end segment leaves one shorter surviving fragment", () => {
    const { store, pins } = seedPinsAndEnterThreadMode();
    const threadLayerId = store.getState().threadLayers[0].id;
    store.extendThreadDraft(pins[0].id);
    store.extendThreadDraft(pins[5].id);
    store.finishThreadDraftWithSegment(threadLayerId, pins[10].id); // A-B-C
    store.setThreadTool("segment-eraser");

    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });
    fireEvent.mouseDown(svg, { clientX: 210, clientY: 200 }); // midpoint of segment A-B, doc(12.5,10)

    const threads = store.getState().threadLayers[0].threadPaths;
    expect(threads).toHaveLength(1);
    expect(threads[0].pinIds).toEqual([pins[5].id, pins[10].id]);
  });

  it("segment eraser on a 2-pin thread's only segment removes it entirely", () => {
    const { store, pins } = seedPinsAndEnterThreadMode();
    const threadLayerId = store.getState().threadLayers[0].id;
    store.extendThreadDraft(pins[0].id);
    store.finishThreadDraftWithSegment(threadLayerId, pins[1].id); // A-B, doc(10,10)-(11,10)
    store.setThreadTool("segment-eraser");

    render(<Canvas store={store} />);
    const svg = screen.getByRole("img", { name: "Board canvas" });
    fireEvent.mouseDown(svg, { clientX: 202, clientY: 200 }); // midpoint, doc(10.5,10)

    expect(store.getState().threadLayers[0].threadPaths).toHaveLength(0);
  });
});
