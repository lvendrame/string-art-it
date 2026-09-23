import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createPinLayer, createPinPath } from "@application/document";
import { PinLayersView } from "./PinLayersView";

const STYLE = { colour: "#fff", diameter: 2, guideVisible: true };

describe("PinLayersView", () => {
  it("renders pin paths from a visible layer", () => {
    const layer = createPinLayer("A");
    const pinPath = createPinPath({ type: "circle", center: { x: 0, y: 0 }, radius: 5 }, 2, STYLE);
    layer.pinPaths = [pinPath];

    const { container } = render(
      <svg>
        <PinLayersView pinLayers={[layer]} selectedPathIds={[]} />
      </svg>,
    );

    expect(container.querySelectorAll("path")).toHaveLength(1);
  });

  it("skips pin paths from a hidden layer", () => {
    const layer = createPinLayer("A");
    const pinPath = createPinPath({ type: "circle", center: { x: 0, y: 0 }, radius: 5 }, 2, STYLE);
    layer.pinPaths = [pinPath];
    layer.visible = false;

    const { container } = render(
      <svg>
        <PinLayersView pinLayers={[layer]} selectedPathIds={[]} />
      </svg>,
    );

    expect(container.querySelectorAll("path")).toHaveLength(0);
  });
});
