import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createPinPath, type PinPathGeometry } from "@application/document";
import { PinPathVisual } from "./PinPathVisual";

const STYLE = { colour: "#fff", diameter: 2, guideVisible: true };

// docs/specs/29-text-pin-path.md — a hand-built "hole letter" (outer 10x10 square ring +
// inner 4x4 square hole), same synthetic fixture as
// src/application/document/pinPath.test.ts, so this doesn't depend on a real font file.
const holeLetter: PinPathGeometry = {
  type: "text",
  origin: { x: 0, y: 0 },
  text: "o",
  fontId: "pt-sans",
  weight: "regular",
  italic: false,
  size: 10,
  letterSpacing: 0,
  rotation: 0,
  contours: [
    [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }],
    [{ x: 3, y: 3 }, { x: 7, y: 3 }, { x: 7, y: 7 }, { x: 3, y: 7 }],
  ],
};

describe("PinPathVisual — multi-contour text", () => {
  it("renders the guide as multiple SVG subpaths, one per contour", () => {
    const pinPath = createPinPath(holeLetter, 2, STYLE);
    const { container } = render(
      <svg>
        <PinPathVisual pinPath={pinPath} selected={false} />
      </svg>,
    );

    const guide = container.querySelector("path");
    expect(guide).not.toBeNull();
    // 2 contours -> 2 "M" (moveto) commands in the combined d attribute.
    expect(guide!.getAttribute("d")!.match(/M/g)).toHaveLength(2);
  });

  it("renders pins from both contours (outer ring and inner hole)", () => {
    const pinPath = createPinPath(holeLetter, 2, STYLE);
    const { container } = render(
      <svg>
        <PinPathVisual pinPath={pinPath} selected={false} />
      </svg>,
    );

    expect(container.querySelectorAll("circle")).toHaveLength(pinPath.pins.length);
    expect(pinPath.pins.length).toBeGreaterThan(0);
  });

  it("a single-contour shape (e.g. Circle) still renders exactly one subpath, unchanged", () => {
    const pinPath = createPinPath({ type: "circle", center: { x: 0, y: 0 }, radius: 5 }, 2, STYLE);
    const { container } = render(
      <svg>
        <PinPathVisual pinPath={pinPath} selected={false} />
      </svg>,
    );

    const guide = container.querySelector("path");
    expect(guide!.getAttribute("d")!.match(/M/g)).toHaveLength(1);
  });
});
