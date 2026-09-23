import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { PinPath, ThreadPath } from "@application/document";
import { GeneratorPreviewOverlay } from "./GeneratorPreviewOverlay";

const pinPath: PinPath = {
  id: "p1",
  geometry: { type: "circle", center: { x: 0, y: 0 }, radius: 5 },
  requestedSpacing: 1,
  actualSpacing: 1,
  pins: [
    { id: "pin-1", x: 5, y: 0 },
    { id: "pin-2", x: 0, y: 5 },
  ],
  guideVisible: true,
  colour: "#fff",
  diameter: 2,
  symmetry: { type: "none" },
};

const threadPath: ThreadPath = {
  id: "t1",
  pinIds: ["pin-1", "pin-2"],
  colours: ["#5b8def"],
  width: 1.5,
  twistPitch: 6,
};

describe("GeneratorPreviewOverlay", () => {
  it("renders every draft Pin Path and Thread Path inside a reduced-opacity group", () => {
    render(
      <svg>
        <GeneratorPreviewOverlay pinPaths={[pinPath]} threadPaths={[threadPath]} />
      </svg>,
    );

    const overlay = screen.getByTestId("generator-preview");
    expect(overlay).toHaveAttribute("opacity", "0.6");
    expect(screen.getByTestId("pin-path")).toBeInTheDocument();
    expect(screen.getByTestId("thread-path")).toBeInTheDocument();
  });

  it("renders an empty group with no draft content", () => {
    render(
      <svg>
        <GeneratorPreviewOverlay pinPaths={[]} threadPaths={[]} />
      </svg>,
    );

    expect(screen.getByTestId("generator-preview").children).toHaveLength(0);
  });
});
