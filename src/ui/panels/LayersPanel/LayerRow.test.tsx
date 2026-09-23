import { render, screen, fireEvent } from "@testing-library/react";
import type { TFunction } from "i18next";
import { describe, expect, it, vi } from "vitest";
import { LayerRow } from "./LayerRow";

const t = ((key: string) => key) as TFunction<"panels">;

describe("LayerRow", () => {
  it("clicking the row calls onSelect and shows the layer name", () => {
    const onSelect = vi.fn();
    render(
      <LayerRow
        layer={{ id: "1", name: "Layer 1", visible: true, locked: false }}
        active={false}
        onSelect={onSelect}
        onToggleVisible={() => {}}
        onToggleLocked={() => {}}
        onRename={() => {}}
        t={t}
      />,
    );
    expect(screen.getByText("Layer 1")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Layer 1"));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("double-clicking the name enters rename mode and commits on Enter", () => {
    const onRename = vi.fn();
    render(
      <LayerRow
        layer={{ id: "1", name: "Layer 1", visible: true, locked: false }}
        active={false}
        onSelect={() => {}}
        onToggleVisible={() => {}}
        onToggleLocked={() => {}}
        onRename={onRename}
        t={t}
      />,
    );
    fireEvent.doubleClick(screen.getByText("Layer 1"));
    const input = screen.getByDisplayValue("Layer 1");
    fireEvent.click(input); // clicking the input itself shouldn't re-select the row
    fireEvent.change(input, { target: { value: "Renamed" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onRename).toHaveBeenCalledWith("Renamed");
  });

  it("commits a rename on blur too, and a non-Enter key does nothing", () => {
    const onRename = vi.fn();
    render(
      <LayerRow
        layer={{ id: "1", name: "Layer 1", visible: true, locked: false }}
        active={false}
        onSelect={() => {}}
        onToggleVisible={() => {}}
        onToggleLocked={() => {}}
        onRename={onRename}
        t={t}
      />,
    );
    fireEvent.doubleClick(screen.getByText("Layer 1"));
    const input = screen.getByDisplayValue("Layer 1");
    fireEvent.change(input, { target: { value: "Renamed" } });
    fireEvent.keyDown(input, { key: "a" });
    expect(onRename).not.toHaveBeenCalled();

    fireEvent.blur(input);
    expect(onRename).toHaveBeenCalledWith("Renamed");
  });

  it("clicking the eye icon toggles visibility without selecting the row", () => {
    const onToggleVisible = vi.fn();
    const onSelect = vi.fn();
    render(
      <LayerRow
        layer={{ id: "1", name: "Layer 1", visible: true, locked: false }}
        active={false}
        onSelect={onSelect}
        onToggleVisible={onToggleVisible}
        onToggleLocked={() => {}}
        onRename={() => {}}
        t={t}
      />,
    );
    fireEvent.click(screen.getByLabelText("layersPanel.hideLayer"));
    expect(onToggleVisible).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("clicking the lock icon toggles locked without selecting the row", () => {
    const onToggleLocked = vi.fn();
    const onSelect = vi.fn();
    render(
      <LayerRow
        layer={{ id: "1", name: "Layer 1", visible: true, locked: false }}
        active={false}
        onSelect={onSelect}
        onToggleVisible={() => {}}
        onToggleLocked={onToggleLocked}
        onRename={() => {}}
        t={t}
      />,
    );
    fireEvent.click(screen.getByLabelText("layersPanel.lockLayer"));
    expect(onToggleLocked).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("reflects hidden/locked/active states in the rendered labels and classes", () => {
    const { container } = render(
      <LayerRow
        layer={{ id: "1", name: "Layer 1", visible: false, locked: true }}
        active={true}
        onSelect={() => {}}
        onToggleVisible={() => {}}
        onToggleLocked={() => {}}
        onRename={() => {}}
        t={t}
      />,
    );
    expect(screen.getByLabelText("layersPanel.showLayer")).toBeInTheDocument();
    expect(screen.getByLabelText("layersPanel.unlockLayer")).toBeInTheDocument();
    expect(container.querySelector(".layers-panel__row--active")).toBeInTheDocument();
  });
});
