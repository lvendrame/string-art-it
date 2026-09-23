import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Section } from "./Section";

describe("Section", () => {
  it("renders the title heading and children", () => {
    render(
      <Section title="Print elements">
        <span>child content</span>
      </Section>,
    );
    expect(screen.getByText("Print elements")).toBeInTheDocument();
    expect(screen.getByText("child content")).toBeInTheDocument();
  });
});
