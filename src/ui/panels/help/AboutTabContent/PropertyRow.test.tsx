import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PropertyRow } from "./PropertyRow";

describe("PropertyRow", () => {
  it("renders the label and value", () => {
    render(<PropertyRow label="Version" value="1.2.3" />);
    expect(screen.getByText("Version")).toBeInTheDocument();
    expect(screen.getByText("1.2.3")).toBeInTheDocument();
  });

  it("applies the mono class only when mono is true", () => {
    render(<PropertyRow label="Version" value="1.2.3" mono={false} />);
    expect(screen.getByText("1.2.3")).not.toHaveClass("mono");
  });
});
