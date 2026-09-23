import { render, screen } from "@testing-library/react";
import type { TFunction } from "i18next";
import { describe, expect, it } from "vitest";
import { HelpSectionView } from "./HelpSectionView";

const t = ((key: string) => key) as TFunction<["help", "common"]>;

describe("HelpSectionView", () => {
  it("renders the heading and each item's label/description", () => {
    render(
      <HelpSectionView
        section={{ headingKey: "Section heading", items: [{ labelKey: "Item label", descriptionKey: "Item description" }] }}
        t={t}
      />,
    );
    expect(screen.getByText("Section heading")).toBeInTheDocument();
    expect(screen.getByText("Item label")).toBeInTheDocument();
    expect(screen.getByText("Item description")).toBeInTheDocument();
  });

  it("omits the heading element when headingKey is absent", () => {
    render(<HelpSectionView section={{ items: [{ labelKey: "Item label", descriptionKey: "Item description" }] }} t={t} />);
    expect(screen.queryByText("Section heading")).not.toBeInTheDocument();
  });
});
