import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CheckboxField } from "./CheckboxField";

describe("CheckboxField", () => {
  it("calls onChange with the new checked state", () => {
    const onChange = vi.fn();
    render(<CheckboxField label="Enabled" checked={false} onChange={onChange} />);

    fireEvent.click(screen.getByRole("checkbox"));

    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("applies the disabled class and attribute when disabled", () => {
    render(<CheckboxField label="Enabled" checked={false} onChange={vi.fn()} disabled />);

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeDisabled();
    expect(checkbox.closest("label")).toHaveClass("is-disabled");
  });
});
