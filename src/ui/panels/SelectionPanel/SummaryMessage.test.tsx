import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SummaryMessage } from "./SummaryMessage";

describe("SummaryMessage", () => {
  it("renders the given text", () => {
    render(<SummaryMessage text="3 Pin Paths selected" />);
    expect(screen.getByText("3 Pin Paths selected")).toBeInTheDocument();
  });
});
