import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createPinLayer, createPinPath, createThreadPath } from "@application/document";
import { ThreadPathVisual } from "./ThreadPathVisual";

const STYLE = { colour: "#fff", diameter: 2, guideVisible: true };

function pinLayerWithPins() {
  const layer = createPinLayer("A");
  const pinPath = createPinPath({ type: "circle", center: { x: 0, y: 0 }, radius: 5 }, 2, STYLE);
  layer.pinPaths = [pinPath];
  return { layer, pins: pinPath.pins };
}

describe("ThreadPathVisual", () => {
  it("renders nothing when fewer than 2 pins resolve", () => {
    const { layer, pins } = pinLayerWithPins();
    const threadPath = createThreadPath([pins[0].id], ["#000"], 1);
    const { container } = render(
      <svg>
        <ThreadPathVisual threadPath={threadPath} pinLayers={[layer]} />
      </svg>,
    );
    expect(container.querySelector("[data-testid='thread-path']")).toBeNull();
  });

  it("renders one path per colour strand, with an accent halo when selected", () => {
    const { layer, pins } = pinLayerWithPins();
    const threadPath = createThreadPath([pins[0].id, pins[1].id, pins[2].id], ["#f00", "#0f0"], 2);
    const { container } = render(
      <svg>
        <ThreadPathVisual threadPath={threadPath} pinLayers={[layer]} selected />
      </svg>,
    );
    expect(container.querySelector("[data-testid='thread-path-selected']")).not.toBeNull();
    expect(container.querySelectorAll("path")).toHaveLength(3); // halo + 2 colour strands
  });

  it("skips pin ids that no longer resolve to a real pin", () => {
    const { layer, pins } = pinLayerWithPins();
    const threadPath = createThreadPath([pins[0].id, "missing-pin", pins[1].id], ["#000"], 1);
    const { container } = render(
      <svg>
        <ThreadPathVisual threadPath={threadPath} pinLayers={[layer]} />
      </svg>,
    );
    expect(container.querySelector("[data-testid='thread-path']")).not.toBeNull();
  });
});
