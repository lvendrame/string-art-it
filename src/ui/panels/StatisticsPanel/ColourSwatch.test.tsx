import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ColourSwatch } from "./ColourSwatch";

describe("ColourSwatch", () => {
  it("renders a span with the given colour as its inline background", () => {
    const { container } = render(<ColourSwatch colour="red" />);
    const swatch = container.querySelector("span");
    expect(swatch).toHaveClass("statistics-panel__swatch");
    expect(swatch?.style.background).toBe("red");
  });
});
