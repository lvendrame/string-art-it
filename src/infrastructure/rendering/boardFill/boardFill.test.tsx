import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { BoardAppearance } from "@application/document";
import { BoardFillDefs } from "./boardFill";

function renderDefs(appearance: BoardAppearance) {
  return render(
    <svg>
      <defs>
        <BoardFillDefs id="test-id" appearance={appearance} />
      </defs>
    </svg>,
  );
}

describe("BoardFillDefs", () => {
  it("renders a linearGradient with one stop per colour stop", () => {
    const { container } = renderDefs({
      type: "linear-gradient",
      direction: 30,
      stops: [
        { offset: 0, colour: "#000" },
        { offset: 100, colour: "#fff" },
      ],
    });

    const gradient = container.querySelector("linearGradient")!;
    expect(gradient).toHaveAttribute("id", "test-id");
    expect(gradient.querySelectorAll("stop")).toHaveLength(2);
  });

  it("renders a radialGradient centred at the given percentage point", () => {
    const { container } = renderDefs({
      type: "radial-gradient",
      centre: { x: 25, y: 75 },
      stops: [{ offset: 0, colour: "#123456" }],
    });

    const gradient = container.querySelector("radialGradient")!;
    expect(gradient).toHaveAttribute("cx", "25%");
    expect(gradient).toHaveAttribute("cy", "75%");
  });

  it("renders a wood-texture pattern with grain bands", () => {
    const { container } = renderDefs({ type: "wood-texture", presetId: "walnut" });
    expect(container.querySelector("pattern")).toHaveAttribute("id", "test-id");
    expect(container.querySelectorAll("path").length).toBeGreaterThan(0);
  });

  it("falls back to walnut for an unknown wood preset id, without throwing", () => {
    expect(() => renderDefs({ type: "wood-texture", presetId: "not-a-real-preset" })).not.toThrow();
  });

  it("renders a painted-wood pattern with grain bands and a tint rect", () => {
    const { container } = renderDefs({ type: "painted-wood", presetId: "sage" });
    expect(container.querySelectorAll("path").length).toBeGreaterThan(0);
    const rect = container.querySelector("rect")!;
    expect(rect).toHaveAttribute("fill", "#7d9166");
  });

  it("painted-wood falls back to WOOD_PRESETS, then walnut, for an unrecognized preset id", () => {
    const woodFallback = renderDefs({ type: "painted-wood", presetId: "oak" });
    expect(woodFallback.container.querySelector("rect")).toHaveAttribute("fill", "#a97c46");

    const walnutFallback = renderDefs({ type: "painted-wood", presetId: "not-a-real-preset" });
    expect(walnutFallback.container.querySelector("rect")).toHaveAttribute("fill", "#6b3f28");
  });

  it("renders a custom-texture pattern referencing the image data URL", () => {
    const { container } = renderDefs({ type: "custom-texture", imageDataUrl: "data:image/png;base64,AAA" });
    const image = container.querySelector("image")!;
    expect(image).toHaveAttribute("href", "data:image/png;base64,AAA");
  });

  it("renders nothing for a solid appearance (handled elsewhere via boardFillPaint)", () => {
    const { container } = renderDefs({ type: "solid", colour: "#ff0000" });
    expect(container.querySelector("defs")!.children).toHaveLength(0);
  });
});
