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
    fireEvent.change(input, { target: { value: "Renamed" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onRename).toHaveBeenCalledWith("Renamed");
  });
});
