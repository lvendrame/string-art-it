import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LandingHero } from "./LandingHero";

describe("LandingHero", () => {
  it("renders the page's h1 with the keyword-rich title and subtitle", () => {
    render(<LandingHero />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Design String Art Online");
    expect(screen.getByText(/Place pins, connect threads across layers/)).toBeInTheDocument();
  });
});
