import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createPinLayer, createPinPath } from "@application/document";
import { DraftPreviewLine } from "./DraftPreviewLine";

const STYLE = { colour: "#fff", diameter: 2, guideVisible: true };

function fixture() {
  const layer = createPinLayer("A");
  const pinPath = createPinPath({ type: "circle", center: { x: 0, y: 0 }, radius: 5 }, 2, STYLE);
  layer.pinPaths = [pinPath];
  return { layer, pins: pinPath.pins };
}

describe("DraftPreviewLine", () => {
  it("renders nothing without a cursor position", () => {
    const { layer, pins } = fixture();
    const { container } = render(
      <svg>
        <DraftPreviewLine pinLayers={[layer]} lastPinId={pins[0].id} cursorDoc={null} threadCandidateId={null} colour="#000" width={1} />
      </svg>,
    );
    expect(container.querySelector("[data-testid='thread-preview']")).toBeNull();
  });

  it("follows the cursor when there is no candidate pin", () => {
    const { layer, pins } = fixture();
    const { container } = render(
      <svg>
        <DraftPreviewLine pinLayers={[layer]} lastPinId={pins[0].id} cursorDoc={{ x: 3, y: 4 }} threadCandidateId={null} colour="#000" width={1} />
      </svg>,
    );
    const line = container.querySelector("[data-testid='thread-preview']");
    expect(line).toHaveAttribute("x2", "3");
    expect(line).toHaveAttribute("y2", "4");
  });

  it("snaps to the candidate pin when one is set", () => {
    const { layer, pins } = fixture();
    const { container } = render(
      <svg>
        <DraftPreviewLine pinLayers={[layer]} lastPinId={pins[0].id} cursorDoc={{ x: 3, y: 4 }} threadCandidateId={pins[1].id} colour="#000" width={1} />
      </svg>,
    );
    const line = container.querySelector("[data-testid='thread-preview']");
    expect(line).toHaveAttribute("x2", String(pins[1].x));
    expect(line).toHaveAttribute("y2", String(pins[1].y));
  });

  it("renders nothing when the last pin no longer resolves", () => {
    const { layer } = fixture();
    const { container } = render(
      <svg>
        <DraftPreviewLine pinLayers={[layer]} lastPinId="missing-pin" cursorDoc={{ x: 3, y: 4 }} threadCandidateId={null} colour="#000" width={1} />
      </svg>,
    );
    expect(container.querySelector("[data-testid='thread-preview']")).toBeNull();
  });

  it("renders nothing when the candidate pin no longer resolves", () => {
    const { layer, pins } = fixture();
    const { container } = render(
      <svg>
        <DraftPreviewLine pinLayers={[layer]} lastPinId={pins[0].id} cursorDoc={{ x: 3, y: 4 }} threadCandidateId="missing-pin" colour="#000" width={1} />
      </svg>,
    );
    expect(container.querySelector("[data-testid='thread-preview']")).toBeNull();
  });
});
