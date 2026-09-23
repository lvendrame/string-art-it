import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ColoursValue } from "./ColoursValue";

describe("ColoursValue", () => {
  it("renders one swatch+label item per colour", () => {
    render(<ColoursValue colours={["red", "white"]} />);
    expect(screen.getByText("red")).toBeInTheDocument();
    expect(screen.getByText("white")).toBeInTheDocument();
  });
});
