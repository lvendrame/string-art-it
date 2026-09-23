import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SliderField } from "./SliderField";

describe("SliderField", () => {
  it("shows the raw value when no format function is given", () => {
    render(<SliderField label="Spacing" value={5} min={0} max={10} onChange={vi.fn()} />);
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("formats the readout value when a format function is given", () => {
    render(<SliderField label="Spacing" value={5} min={0} max={10} onChange={vi.fn()} format={(v) => `${v}mm`} />);
    expect(screen.getByText("5mm")).toBeInTheDocument();
  });

  it("calls onChange with the new numeric value", () => {
    const onChange = vi.fn();
    render(<SliderField label="Spacing" value={5} min={0} max={10} onChange={onChange} />);

    fireEvent.change(screen.getByRole("slider"), { target: { value: "8" } });

    expect(onChange).toHaveBeenCalledWith(8);
  });

  it("applies the disabled class and attribute when disabled", () => {
    render(<SliderField label="Spacing" value={5} min={0} max={10} onChange={vi.fn()} disabled />);

    const slider = screen.getByRole("slider");
    expect(slider).toBeDisabled();
    expect(slider.closest("label")).toHaveClass("is-disabled");
  });
});
