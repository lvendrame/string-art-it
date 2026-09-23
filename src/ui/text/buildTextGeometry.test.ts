import { describe, expect, it, vi } from "vitest";

vi.mock("@infrastructure/fonts/fontLoader", () => ({
  ensureFontLoaded: vi.fn().mockResolvedValue({ fake: "font" }),
}));
vi.mock("@infrastructure/fonts/textContours", () => ({
  getTextContours: vi.fn().mockReturnValue([
    [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ],
  ]),
}));

const { buildTextGeometry } = await import("./buildTextGeometry");

describe("buildTextGeometry", () => {
  it("loads the font, lays out contours, and offsets them by the origin", async () => {
    const result = await buildTextGeometry({ x: 10, y: 20 }, "Hi", "roboto", "regular", false, 24, 0);

    expect(result).toEqual({
      type: "text",
      origin: { x: 10, y: 20 },
      text: "Hi",
      fontId: "roboto",
      weight: "regular",
      italic: false,
      size: 24,
      letterSpacing: 0,
      rotation: 0,
      contours: [
        [
          { x: 10, y: 20 },
          { x: 11, y: 21 },
        ],
      ],
    });
  });
});
