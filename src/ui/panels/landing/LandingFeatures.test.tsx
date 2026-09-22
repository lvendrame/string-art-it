import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LandingFeatures } from "./LandingFeatures";
import { LANDING_FEATURES } from "./featuresContent";

describe("LandingFeatures", () => {
  it("renders every feature's translated title", () => {
    render(<LandingFeatures />);

    expect(screen.getAllByText(/./).length).toBeGreaterThan(0);
    expect(screen.getByText("Any board shape")).toBeInTheDocument();
    expect(screen.getByText("Print-ready templates")).toBeInTheDocument();
  });

  it("renders one card per entry in LANDING_FEATURES", () => {
    render(<LandingFeatures />);

    expect(
      screen.getAllByText(/./).filter((el) => el.tagName === "SPAN" && el.className.includes("landing-features__title")),
    ).toHaveLength(LANDING_FEATURES.length);
  });
});
