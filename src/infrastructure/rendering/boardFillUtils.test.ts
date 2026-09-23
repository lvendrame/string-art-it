import { describe, expect, it } from "vitest";
import type { BoardAppearance } from "@application/document";
import { boardFillDefsMarkup, boardFillPaint, PAINT_PRESET_IDS, WOOD_PRESET_IDS } from "./boardFillUtils";

describe("boardFillPaint", () => {
  it("returns the plain colour for a solid appearance", () => {
    expect(boardFillPaint("id", { type: "solid", colour: "#ff0000" })).toBe("#ff0000");
  });

  it("returns a url(#id) reference for every non-solid appearance", () => {
    expect(boardFillPaint("my-id", { type: "wood-texture", presetId: "walnut" })).toBe("url(#my-id)");
  });
});

describe("boardFillDefsMarkup", () => {
  it("builds a linearGradient with one stop per colour stop", () => {
    const appearance: BoardAppearance = {
      type: "linear-gradient",
      direction: 45,
      stops: [
        { offset: 0, colour: "#000" },
        { offset: 100, colour: "#fff" },
      ],
    };
    const markup = boardFillDefsMarkup("g1", appearance);
    expect(markup).toContain('<linearGradient id="g1" gradientTransform="rotate(45)">');
    expect(markup).toContain('<stop offset="0%" stop-color="#000"/>');
    expect(markup).toContain('<stop offset="100%" stop-color="#fff"/>');
  });

  it("builds a radialGradient centred at the given percentage point", () => {
    const appearance: BoardAppearance = {
      type: "radial-gradient",
      centre: { x: 30, y: 70 },
      stops: [{ offset: 0, colour: "#123456" }],
    };
    const markup = boardFillDefsMarkup("g2", appearance);
    expect(markup).toContain('<radialGradient id="g2" cx="30%" cy="70%">');
    expect(markup).toContain('<stop offset="0%" stop-color="#123456"/>');
  });

  it("builds a wood-texture pattern with grain bands but no tint rect", () => {
    const markup = boardFillDefsMarkup("g3", { type: "wood-texture", presetId: "walnut" });
    expect(markup).toContain('<pattern id="g3"');
    expect(markup).toContain("<path d=");
    expect(markup).not.toContain("fill-opacity");
  });

  it("falls back to walnut's palette for an unknown wood preset id, without throwing", () => {
    expect(() => boardFillDefsMarkup("g", { type: "wood-texture", presetId: "not-a-real-preset" })).not.toThrow();
  });

  it("builds a painted-wood pattern with grain bands AND a translucent tint rect", () => {
    const markup = boardFillDefsMarkup("g4", { type: "painted-wood", presetId: "sage" });
    expect(markup).toContain("<path d=");
    expect(markup).toContain('fill-opacity="0.45"');
  });

  it("painted-wood falls back through PAINT_PRESETS, then WOOD_PRESETS, then walnut", () => {
    const paint = boardFillDefsMarkup("g", { type: "painted-wood", presetId: "sage" });
    expect(paint).toContain("#7d9166"); // sage's tint colour

    const woodFallback = boardFillDefsMarkup("g", { type: "painted-wood", presetId: "oak" });
    expect(woodFallback).toContain("#a97c46"); // oak's own tint colour, since it's not a PAINT_PRESETS id

    const walnutFallback = boardFillDefsMarkup("g", { type: "painted-wood", presetId: "not-a-real-preset" });
    expect(walnutFallback).toContain("#6b3f28"); // walnut's tint colour
  });

  it("builds a custom-texture pattern referencing the data URL", () => {
    const markup = boardFillDefsMarkup("g5", { type: "custom-texture", imageDataUrl: "data:image/png;base64,AAA" });
    expect(markup).toContain('<image href="data:image/png;base64,AAA"');
  });

  it("returns an empty string for an unrecognized appearance type", () => {
    expect(boardFillDefsMarkup("g", { type: "unknown" } as unknown as BoardAppearance)).toBe("");
  });
});

describe("preset id lists", () => {
  it("expose every wood/paint preset id", () => {
    expect(WOOD_PRESET_IDS).toContain("walnut");
    expect(PAINT_PRESET_IDS).toContain("sage");
  });
});
