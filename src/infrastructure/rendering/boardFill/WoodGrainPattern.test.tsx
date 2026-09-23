import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WoodGrainPattern } from "./WoodGrainPattern";

const geometry = {
  bands: [
    { d: "M0,0 L1,0 L1,1 Z", colour: "#8b5a2b" },
    { d: "M0,1 L1,1 L1,2 Z", colour: "#6f4520" },
  ],
};

describe("WoodGrainPattern", () => {
  it("renders one path per band, filled with that band's colour", () => {
    const { container } = render(
      <svg>
        <defs>
          <WoodGrainPattern id="test-pattern" geometry={geometry} />
        </defs>
      </svg>,
    );

    const paths = container.querySelectorAll("path");
    expect(paths).toHaveLength(2);
    expect(paths[0]).toHaveAttribute("fill", "#8b5a2b");
    expect(paths[1]).toHaveAttribute("fill", "#6f4520");
    expect(container.querySelector("pattern")).toHaveAttribute("id", "test-pattern");
  });

  it("does not render a tint rect when no tint is given", () => {
    const { container } = render(
      <svg>
        <defs>
          <WoodGrainPattern id="test-pattern" geometry={geometry} />
        </defs>
      </svg>,
    );

    expect(container.querySelector("rect")).not.toBeInTheDocument();
  });

  it("renders a translucent tint rect on top when tint is given", () => {
    const { container } = render(
      <svg>
        <defs>
          <WoodGrainPattern id="test-pattern" geometry={geometry} tint="#ff0000" />
        </defs>
      </svg>,
    );

    const rect = container.querySelector("rect");
    expect(rect).toHaveAttribute("fill", "#ff0000");
    expect(rect).toHaveAttribute("fill-opacity", "0.45");
  });
});
