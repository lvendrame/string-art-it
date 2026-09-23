import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PinStateLegend } from "./PinStateLegend";

describe("PinStateLegend", () => {
  it("renders the swatch and label", () => {
    render(<PinStateLegend swatch={<span data-testid="dot" />} label="Active origin" />);
    expect(screen.getByTestId("dot")).toBeInTheDocument();
    expect(screen.getByText("Active origin")).toBeInTheDocument();
  });
});
