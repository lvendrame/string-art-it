import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LandingFAQ } from "./LandingFAQ";
import { FAQ_ITEMS } from "./faqContent";

describe("LandingFAQ", () => {
  it("renders every FAQ question and answer", () => {
    render(<LandingFAQ />);

    expect(screen.getByText("What is string art?")).toBeInTheDocument();
    expect(screen.getByText(/StringArtIt lets you design that pin-and-thread layout digitally/)).toBeInTheDocument();
  });

  it("renders exactly one entry per item in FAQ_ITEMS", () => {
    render(<LandingFAQ />);

    expect(screen.getByText("Is StringArtIt free to use?")).toBeInTheDocument();
    expect(screen.getAllByText(/\?$/)).toHaveLength(FAQ_ITEMS.length);
  });
});
