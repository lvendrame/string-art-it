import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EditorStore } from "../../application/document";
import { GridSettingsPopover } from "./GridSettingsPopover";

describe("GridSettingsPopover", () => {
  it("renders a trigger and keeps the fields hidden until opened", () => {
    const store = new EditorStore();
    render(<GridSettingsPopover store={store} />);

    expect(screen.getByRole("button", { name: "Grid settings" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Gap X")).not.toBeInTheDocument();
  });

  it("opens to show Gap X, Gap Y, Grid colour, and Grid opacity pre-filled from the store", () => {
    const store = new EditorStore();
    render(<GridSettingsPopover store={store} />);
    fireEvent.click(screen.getByRole("button", { name: "Grid settings" }));

    const { gapX, gapY, colour, opacity } = store.getState().grid;
    expect(screen.getByLabelText("Gap X")).toHaveValue(gapX);
    expect(screen.getByLabelText("Gap Y")).toHaveValue(gapY);
    expect(screen.getByLabelText("Grid colour")).toHaveValue(colour);
    expect(screen.getByLabelText("Grid opacity")).toHaveValue(opacity);
  });

  it("grid gap fields are configurable and independent per axis", () => {
    const store = new EditorStore();
    render(<GridSettingsPopover store={store} />);
    fireEvent.click(screen.getByRole("button", { name: "Grid settings" }));

    fireEvent.change(screen.getByLabelText("Gap X"), { target: { value: "2.5" } });
    fireEvent.change(screen.getByLabelText("Gap Y"), { target: { value: "0.5" } });

    expect(store.getState().grid.gapX).toBe(2.5);
    expect(store.getState().grid.gapY).toBe(0.5);
  });

  it("grid colour and opacity are configurable", () => {
    const store = new EditorStore();
    render(<GridSettingsPopover store={store} />);
    fireEvent.click(screen.getByRole("button", { name: "Grid settings" }));

    fireEvent.change(screen.getByLabelText("Grid colour"), { target: { value: "#ff0000" } });
    fireEvent.change(screen.getByLabelText("Grid opacity"), { target: { value: "0.3" } });

    expect(store.getState().grid.colour).toBe("#ff0000");
    expect(store.getState().grid.opacity).toBe(0.3);
  });

  it("re-clicking the trigger closes the popover", () => {
    const store = new EditorStore();
    render(<GridSettingsPopover store={store} />);
    const trigger = screen.getByRole("button", { name: "Grid settings" });

    fireEvent.click(trigger);
    expect(screen.getByLabelText("Gap X")).toBeInTheDocument();

    fireEvent.click(trigger);
    expect(screen.queryByLabelText("Gap X")).not.toBeInTheDocument();
  });

  it("closes on Escape", () => {
    const store = new EditorStore();
    render(<GridSettingsPopover store={store} />);
    fireEvent.click(screen.getByRole("button", { name: "Grid settings" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes on outside click", () => {
    const store = new EditorStore();
    render(
      <div>
        <div data-testid="outside" />
        <GridSettingsPopover store={store} />
      </div>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Grid settings" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.pointerDown(screen.getByTestId("outside"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
