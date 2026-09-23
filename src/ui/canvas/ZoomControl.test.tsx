import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EditorStore } from "@application/document";
import { zoomToPercent } from "@domain/transforms";
import { ZoomControl } from "./ZoomControl";

function renderControl(store: EditorStore) {
  const { rerender } = render(
    <div>
      <div data-testid="outside" />
      <ZoomControl store={store} viewport={store.getState().viewport} />
    </div>,
  );
  const update = () =>
    rerender(
      <div>
        <div data-testid="outside" />
        <ZoomControl store={store} viewport={store.getState().viewport} />
      </div>,
    );
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

  it("ArrowDown on the input opens the preset list", () => {
    const store = new EditorStore();
    const input = renderControl(store);

    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: "ArrowDown" });

    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("ArrowDown/ArrowUp move focus between preset options, wrapping at each end", () => {
    const store = new EditorStore();
    renderControl(store);

    fireEvent.click(screen.getByRole("button", { name: "Zoom presets" }));
    const listbox = screen.getByRole("listbox");
    const options = screen.getAllByRole("option");

    fireEvent.keyDown(listbox, { key: "ArrowDown" });
    expect(options[0]).toHaveFocus();

    options[0].focus();
    fireEvent.keyDown(listbox, { key: "ArrowDown" });
    expect(options[1]).toHaveFocus();

    fireEvent.keyDown(listbox, { key: "ArrowUp" });
    expect(options[0]).toHaveFocus();

    fireEvent.keyDown(listbox, { key: "ArrowUp" });
    expect(options[options.length - 1]).toHaveFocus();
  });

  it("Escape while the list is open closes it and refocuses the input", () => {
    const store = new EditorStore();
    const input = renderControl(store);

    fireEvent.click(screen.getByRole("button", { name: "Zoom presets" }));
    const listbox = screen.getByRole("listbox");

    fireEvent.keyDown(listbox, { key: "Escape" });

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(input).toHaveFocus();
  });

  it("a key other than Enter/Escape/ArrowDown on the input does nothing special", () => {
    const store = new EditorStore();
    const before = store.getState().viewport;
    const input = renderControl(store);

    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: "a" });

    expect(store.getState().viewport).toBe(before);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("ArrowUp on the list with no option focused wraps to the last option", () => {
    const store = new EditorStore();
    renderControl(store);

    fireEvent.click(screen.getByRole("button", { name: "Zoom presets" }));
    const listbox = screen.getByRole("listbox");
    const options = screen.getAllByRole("option");
    (document.activeElement as HTMLElement | null)?.blur();

    fireEvent.keyDown(listbox, { key: "ArrowUp" });
    expect(options[options.length - 1]).toHaveFocus();
  });

  it("blurring the input while the preset list is open does not commit", () => {
    const store = new EditorStore();
    const before = store.getState().viewport;
    const input = renderControl(store);

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "999" } });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.blur(input);

    expect(store.getState().viewport).toBe(before);
  });

  it("closes the preset list on outside click", () => {
    const store = new EditorStore();
    renderControl(store);

    fireEvent.click(screen.getByRole("button", { name: "Zoom presets" }));
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    fireEvent.pointerDown(screen.getByTestId("outside"));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("a key other than ArrowDown/ArrowUp/Escape on the list does nothing", () => {
    const store = new EditorStore();
    renderControl(store);

    fireEvent.click(screen.getByRole("button", { name: "Zoom presets" }));
    const listbox = screen.getByRole("listbox");

    fireEvent.keyDown(listbox, { key: "Tab" });
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("marks the matching preset as selected when the current zoom equals it exactly", () => {
    const store = new EditorStore();
    const input = renderControl(store);

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "200" } });
    fireEvent.keyDown(input, { key: "Enter" });

    fireEvent.click(screen.getByRole("button", { name: "Zoom presets" }));
    expect(screen.getByRole("option", { name: "200%" })).toHaveAttribute("aria-selected", "true");
  });

  it("Escape reverting a real focused edit doesn't re-trigger commit on the resulting blur", () => {
    const store = new EditorStore();
    const before = store.getState().viewport;
    const input = renderControl(store);

    input.focus();
    fireEvent.change(input, { target: { value: "999" } });
    fireEvent.keyDown(input, { key: "Escape" });

    expect(store.getState().viewport).toBe(before);
  });
});
