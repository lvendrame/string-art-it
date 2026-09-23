import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EditorStore } from "@application/document";
import { zoomToPercent } from "@domain/transforms";
import { ZoomControl } from "./ZoomControl";

function renderControl(store: EditorStore) {
  const { rerender } = render(<ZoomControl store={store} viewport={store.getState().viewport} />);
  const update = () => rerender(<ZoomControl store={store} viewport={store.getState().viewport} />);
  store.subscribe(update);
  return screen.getByRole("combobox", { name: "Zoom level" }) as HTMLInputElement;
}

describe("ZoomControl", () => {
  it("shows the current zoom as a percentage", () => {
    const store = new EditorStore();
    const input = renderControl(store);
    expect(input.value).toBe(`${Math.round(zoomToPercent(store.getState().viewport.zoom))}%`);
  });

  it("typing a value and pressing Enter commits it, clamped to the valid range", () => {
    const store = new EditorStore();
    const input = renderControl(store);

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "9999" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(Math.round(zoomToPercent(store.getState().viewport.zoom))).toBe(1600);
    expect(input.value).toBe("1600%");
  });

  it("blurring the input commits the typed value", () => {
    const store = new EditorStore();
    const input = renderControl(store);

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "50" } });
    fireEvent.blur(input);

    expect(Math.round(zoomToPercent(store.getState().viewport.zoom))).toBe(50);
  });

  it("Escape reverts an in-progress edit without applying it", () => {
    const store = new EditorStore();
    const before = store.getState().viewport;
    const input = renderControl(store);

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "999" } });
    fireEvent.keyDown(input, { key: "Escape" });

    expect(store.getState().viewport).toBe(before);
    expect(input.value).toBe(`${Math.round(zoomToPercent(before.zoom))}%`);
  });

  it("selecting a preset from the dropdown sets that zoom", () => {
    const store = new EditorStore();
    renderControl(store);

    fireEvent.click(screen.getByRole("button", { name: "Zoom presets" }));
    fireEvent.click(screen.getByRole("option", { name: "200%" }));

    expect(Math.round(zoomToPercent(store.getState().viewport.zoom))).toBe(200);
  });

  it("an empty/invalid typed value is discarded on commit", () => {
    const store = new EditorStore();
    const before = store.getState().viewport;
    const input = renderControl(store);

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(store.getState().viewport).toBe(before);
  });
});
