import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatCard } from "./StatCard";

describe("StatCard", () => {
  it("renders the title and each label/value row", () => {
    render(<StatCard title="Path 1" rows={[["Pins", "16"], ["Requested gap", "2.00 cm"]]} />);
    expect(screen.getByText("Path 1")).toBeInTheDocument();
    expect(screen.getByText("Pins").nextSibling).toHaveTextContent("16");
    expect(screen.getByText("Requested gap").nextSibling).toHaveTextContent("2.00 cm");
  });
});
