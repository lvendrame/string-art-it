import { describe, expect, it } from "vitest";
import type { SymmetryConfig } from "@application/document";
import { symmetryPreviewTransforms } from "./symmetryPreviewTransforms";

describe("symmetryPreviewTransforms", () => {
  it("returns no transforms for none", () => {
    expect(symmetryPreviewTransforms({ type: "none" } as SymmetryConfig)).toEqual([]);
  });

  it("returns one rotate transform per interval step for radial", () => {
    const config: SymmetryConfig = { type: "radial", centre: { x: 5, y: 7 }, intervalDegrees: 90 };
    expect(symmetryPreviewTransforms(config)).toEqual(["rotate(90 5 7)", "rotate(180 5 7)", "rotate(270 5 7)"]);
  });

  it("returns a single mirror transform for vertical", () => {
    const config: SymmetryConfig = { type: "vertical", axis: { x: 3, y: 4 } };
    expect(symmetryPreviewTransforms(config)).toEqual(["translate(6 0) scale(-1 1)"]);
  });

  it("returns a single mirror transform for horizontal", () => {
    const config: SymmetryConfig = { type: "horizontal", axis: { x: 3, y: 4 } };
    expect(symmetryPreviewTransforms(config)).toEqual(["translate(0 8) scale(1 -1)"]);
  });

  it("returns vertical, horizontal, and diagonal (both) transforms for both", () => {
    const config: SymmetryConfig = { type: "both", axis: { x: 3, y: 4 } };
    expect(symmetryPreviewTransforms(config)).toEqual(["translate(6 0) scale(-1 1)", "translate(0 8) scale(1 -1)", "translate(6 8) scale(-1 -1)"]);
  });
});
