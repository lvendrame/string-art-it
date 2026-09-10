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
});
