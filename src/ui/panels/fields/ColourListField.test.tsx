import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ColourListField } from "./ColourListField";

const labels = { title: "Colours", add: "Add", remove: "Remove", colourN: (n: number) => `Colour ${n}` };

describe("ColourListField", () => {
  it("seeds a new swatch from the given palette", () => {
    const onChange = vi.fn();
    render(<ColourListField colours={["#000000"]} max={3} onChange={onChange} labels={labels} palette={["#aaaaaa", "#bbbbbb"]} />);
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(onChange).toHaveBeenCalledWith(["#000000", "#bbbbbb"]);
  });

  it("disables add at max and remove at one colour, and hides an absent note", () => {
    const { container } = render(<ColourListField colours={["#000000"]} max={1} onChange={vi.fn()} labels={labels} />);
    expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Remove" })).toBeDisabled();
    expect(container.querySelector(".colour-list-field__note")).toBeNull();
  });
});
