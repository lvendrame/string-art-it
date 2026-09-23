import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CollapsibleSection } from "./CollapsibleSection";

describe("CollapsibleSection", () => {
  it("renders the title and open state, defaulting to open", () => {
    const { container } = render(<CollapsibleSection title="Summary">content</CollapsibleSection>);
    expect(screen.getByText("Summary")).toBeInTheDocument();
    expect(container.querySelector("details")?.open).toBe(true);
  });

  it("respects defaultOpen={false}", () => {
    const { container } = render(
      <CollapsibleSection title="Details" defaultOpen={false}>
        content
      </CollapsibleSection>,
    );
    expect(container.querySelector("details")?.open).toBe(false);
  });
});
