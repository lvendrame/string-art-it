import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PinPathStatsBox } from "./PinPathStatsBox";

describe("PinPathStatsBox", () => {
  it("shows pins, actual gap, and perimeter when actualGapCm is given", () => {
    render(<PinPathStatsBox pins={16} actualGapCm={1.94} perimeterCm={31} />);
    expect(screen.getByText("Pins").nextSibling).toHaveTextContent("16");
    expect(screen.getByText("Actual gap").nextSibling).toHaveTextContent("1.94 cm");
    expect(screen.getByText("Path perimeter").nextSibling).toHaveTextContent("31.00 cm");
  });

  it("omits Actual gap when actualGapCm is not given", () => {
    render(<PinPathStatsBox pins={16} perimeterCm={31} />);
    expect(screen.queryByText("Actual gap")).not.toBeInTheDocument();
  });
});
