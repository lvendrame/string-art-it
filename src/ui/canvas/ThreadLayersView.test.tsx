import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createPinLayer, createPinPath, createThreadLayer, createThreadPath } from "@application/document";
import { ThreadLayersView } from "./ThreadLayersView";

const STYLE = { colour: "#fff", diameter: 2, guideVisible: true };

function fixture() {
  const pinLayer = createPinLayer("A");
  const pinPath = createPinPath({ type: "circle", center: { x: 0, y: 0 }, radius: 5 }, 2, STYLE);
  pinLayer.pinPaths = [pinPath];
  const threadLayer = createThreadLayer("Thread A");
  threadLayer.threadPaths = [createThreadPath([pinPath.pins[0].id, pinPath.pins[1].id], ["#000"], 1)];
  return { pinLayer, threadLayer };
}

describe("ThreadLayersView", () => {
  it("renders thread paths from a visible layer", () => {
    const { pinLayer, threadLayer } = fixture();
    const { container } = render(
      <svg>
        <ThreadLayersView threadLayers={[threadLayer]} pinLayers={[pinLayer]} />
      </svg>,
    );
    expect(container.querySelectorAll("[data-testid='thread-path']")).toHaveLength(1);
  });

  it("skips thread paths from a hidden layer", () => {
    const { pinLayer, threadLayer } = fixture();
    threadLayer.visible = false;
    const { container } = render(
      <svg>
        <ThreadLayersView threadLayers={[threadLayer]} pinLayers={[pinLayer]} />
      </svg>,
    );
    expect(container.querySelectorAll("[data-testid='thread-path']")).toHaveLength(0);
  });
});
