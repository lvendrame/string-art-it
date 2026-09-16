import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LandingHowItWorks } from "./LandingHowItWorks";
import { LANDING_STEPS } from "./howItWorksContent";

describe("LandingHowItWorks", () => {
  it("renders every step's translated title in order", () => {
    render(<LandingHowItWorks />);

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(LANDING_STEPS.length);
    expect(items[0]).toHaveTextContent("Set up your board");
    expect(items[items.length - 1]).toHaveTextContent("Export & print");
  });

  it("numbers each step starting from 1", () => {
    render(<LandingHowItWorks />);

    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText(String(LANDING_STEPS.length))).toBeInTheDocument();
  });
});
