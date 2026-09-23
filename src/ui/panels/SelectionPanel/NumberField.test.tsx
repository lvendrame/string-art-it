import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NumberField } from "./NumberField";

describe("NumberField", () => {
  it("renders the value rounded to 3 decimals and calls onChange with a number", () => {
    const onChange = vi.fn();
    render(<NumberField label="Radius" value={5.123456} onChange={onChange} />);

    const input = screen.getByLabelText("Radius") as HTMLInputElement;
    expect(input.value).toBe("5.123");
    fireEvent.change(input, { target: { value: "7.5" } });
    expect(onChange).toHaveBeenCalledWith(7.5);
  });
});
