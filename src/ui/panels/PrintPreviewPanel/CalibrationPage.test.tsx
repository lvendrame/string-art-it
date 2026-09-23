import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CalibrationPage } from "./CalibrationPage";

describe("CalibrationPage", () => {
  it("renders a 10cm reference line with its label", () => {
    render(<CalibrationPage paperSize={{ width: 21, height: 29.7 }} />);
    expect(screen.getByText(/10 cm/)).toBeInTheDocument();
  });
});
