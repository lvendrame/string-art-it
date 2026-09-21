import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EditorStore } from "../../application/document";
import { StatisticsPanel } from "./StatisticsPanel";

describe("StatisticsPanel", () => {
  it("shows the project-level total pins", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    store.addPinPath(layerId, { type: "line", start: { x: 0, y: 0 }, end: { x: 8, y: 0 } }); // 9 pins

    render(<StatisticsPanel store={store} onClose={() => {}} />);

    expect(screen.getByText("Total pins").previousSibling).toHaveTextContent("9");
  });

  it("shows a card per Pin Path with pin count and spacing", () => {
    const store = new EditorStore();
    store.setPinProperty({ spacing: 2 });
    const layerId = store.getState().pinLayers[0].id;
    store.addPinPath(layerId, { type: "circle", center: { x: 0, y: 0 }, radius: 31 / (2 * Math.PI) });
    render(<StatisticsPanel store={store} onClose={() => {}} />);

    expect(screen.getByText("Pins").nextSibling).toHaveTextContent("16");
    expect(screen.getByText("Actual gap").nextSibling).toHaveTextContent("1.94 cm");
  });

  it("close button invokes onClose", () => {
    const store = new EditorStore();
    const onClose = vi.fn();
    render(<StatisticsPanel store={store} onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("splits content into a collapsible Summary (open) and Details (closed) section", () => {
    const store = new EditorStore();
    const { container } = render(<StatisticsPanel store={store} onClose={() => {}} />);

    const sections = container.querySelectorAll("details");
    expect(sections).toHaveLength(2);
    expect(sections[0].open).toBe(true);
    expect(sections[1].open).toBe(false);
    expect(screen.getByText("Summary")).toBeInTheDocument();
    expect(screen.getByText("Details")).toBeInTheDocument();
  });

  it("shows Total pins only within Summary, not duplicated in Details", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    store.addPinPath(layerId, { type: "line", start: { x: 0, y: 0 }, end: { x: 8, y: 0 } });
    const { container } = render(<StatisticsPanel store={store} onClose={() => {}} />);

    const [summary, details] = container.querySelectorAll("details");
    expect(screen.getByText("Total pins")).toBeInTheDocument(); // getByText throws if there were more than one
    expect(summary.textContent).toContain("Total pins");
    expect(details.textContent).not.toContain("Total pins");
  });

  it("groups thread stats by type in Summary, keeping a multi-colour thread separate from a plain one of its colours", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    store.addPinPath(layerId, { type: "line", start: { x: 0, y: 0 }, end: { x: 8, y: 0 } });
    const pins = store.getState().pinLayers[0].pinPaths[0].pins;
    const threadLayerId = store.getState().threadLayers[0].id;

    store.setThreadDefaults({ colours: ["red"], width: 1.5 });
    store.extendThreadDraft(pins[0].id);
    store.finishThreadDraftWithSegment(threadLayerId, pins[5].id); // 0->5, 5cm, plain red

    store.setThreadDefaults({ colours: ["red", "white"], width: 1.5 });
    store.extendThreadDraft(pins[0].id);
    store.finishThreadDraftWithSegment(threadLayerId, pins[3].id); // 0->3, 3cm, red+white twist

    const { container } = render(<StatisticsPanel store={store} onClose={() => {}} />);
    const [summary] = container.querySelectorAll("details");

    // each type's title div renders one swatch+text span per colour concatenated with no
    // separator, so its textContent is exactly "red" for the plain type and "redwhite" for
    // the two-colour type — never merged into one "red" bucket
    const titleDiv = (text: string) => Array.from(summary.querySelectorAll("div")).find((el) => el.textContent === text);
    expect(titleDiv("red")?.parentElement?.textContent).toContain("0.05 m"); // only the plain-red thread
    expect(titleDiv("redwhite")?.parentElement?.textContent).toContain("0.03 m"); // only the red+white thread
  });

  it("shows the thread width in each Summary type card", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    store.addPinPath(layerId, { type: "line", start: { x: 0, y: 0 }, end: { x: 8, y: 0 } });
    const pins = store.getState().pinLayers[0].pinPaths[0].pins;
    const threadLayerId = store.getState().threadLayers[0].id;
    store.setThreadDefaults({ colours: ["red"], width: 2.5 });
    store.extendThreadDraft(pins[0].id);
    store.finishThreadDraftWithSegment(threadLayerId, pins[5].id);

    render(<StatisticsPanel store={store} onClose={() => {}} />);

    expect(screen.getByText("Width").nextSibling).toHaveTextContent("2.5");
  });

  it("renders a rectangular colour swatch next to colours in both Summary and Details", () => {
    const store = new EditorStore();
    const layerId = store.getState().pinLayers[0].id;
    store.addPinPath(layerId, { type: "line", start: { x: 0, y: 0 }, end: { x: 8, y: 0 } });
    const pins = store.getState().pinLayers[0].pinPaths[0].pins;
    const threadLayerId = store.getState().threadLayers[0].id;
    store.setThreadDefaults({ colours: ["red"] });
    store.extendThreadDraft(pins[0].id);
    store.finishThreadDraftWithSegment(threadLayerId, pins[5].id);

    const { container } = render(<StatisticsPanel store={store} onClose={() => {}} />);
    const [summary, details] = container.querySelectorAll("details");

    const swatchIn = (el: Element) => Array.from(el.querySelectorAll("span")).find((s) => s.style.background === "red");
    expect(swatchIn(summary)).toBeTruthy();
    expect(swatchIn(details)).toBeTruthy();
  });
});
