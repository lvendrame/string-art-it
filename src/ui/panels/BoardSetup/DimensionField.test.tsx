import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DimensionField } from "./DimensionField";

describe("DimensionField", () => {
  it("renders the label and value, and calls onChange with the new number", () => {
    const onChange = vi.fn();
    render(<DimensionField label="Diameter" value={60} onChange={onChange} />);

    const input = screen.getByLabelText("Diameter") as HTMLInputElement;
    expect(input.value).toBe("60");
    fireEvent.change(input, { target: { value: "75" } });
    expect(onChange).toHaveBeenCalledWith(75);
  });
});
