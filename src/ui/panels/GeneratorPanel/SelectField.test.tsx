import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SelectField } from "./SelectField";

describe("SelectField", () => {
  it("renders the options and calls onChange with the selected value", () => {
    const onChange = vi.fn();
    render(
      <SelectField
        label="Pattern"
        value="a"
        options={[{ value: "a", label: "A" }, { value: "b", label: "B" }]}
        onChange={onChange}
      />,
    );
    fireEvent.change(screen.getByLabelText("Pattern"), { target: { value: "b" } });
    expect(onChange).toHaveBeenCalledWith("b");
  });
});
