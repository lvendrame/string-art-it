import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse, type Font } from "opentype.js";
import { beforeAll, describe, expect, it } from "vitest";
import type { Point } from "@domain/paths";
import { getTextContours } from "./textContours";

// Integration-style test against a real bundled font file — this is what actually
// catches Y-flip sign errors and multi-contour holes; the pure flattening math already
// has its own hand-built-command unit tests in domain/text/glyphOutline.test.ts.
let font: Font;

beforeAll(() => {
  const buffer = readFileSync(join(process.cwd(), "public/fonts/pt-sans/Regular.ttf"));
  font = parse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
});

describe("getTextContours", () => {
  it("a hole letter ('o') produces at least 2 contours", () => {
    const contours = getTextContours(font, "o", 10, 0);
    expect(contours.length).toBeGreaterThanOrEqual(2);
    for (const contour of contours) expect(contour.length).toBeGreaterThan(0);
  });

  it("advances the second letter to the right of the first", () => {
    const single = getTextContours(font, "l", 10, 0);
    const pair = getTextContours(font, "ll", 10, 0);
    const maxX = (contours: Point[][]) => Math.max(...contours.flat().map((p) => p.x));
    // The second "l" in "ll" reaches further right than a lone "l" drawn at x=0.
    expect(maxX(pair)).toBeGreaterThan(maxX(single));
  });

  it("letterSpacing adds extra gap beyond the glyph's own advance width", () => {
    const maxX = (contours: Point[][]) => Math.max(...contours.flat().map((p) => p.x));
    const noSpacing = getTextContours(font, "ll", 10, 0);
    const withSpacing = getTextContours(font, "ll", 10, 5);
    expect(maxX(withSpacing)).toBeGreaterThan(maxX(noSpacing));
  });

  it("glyphs come out Y-down (ascender above baseline means negative Y), matching this app's document space", () => {
    // "l" is a simple tall ascender-only glyph: every point should sit at or above the
    // baseline (y <= 0 in Y-down space), never noticeably below it. opentype.js's own
    // Glyph.getPath already negates the font's raw Y-up coordinates, so no extra flip
    // is needed in textContours.ts — this test is what would catch it if that changed.
    const contours = getTextContours(font, "l", 10, 0);
    const maxY = Math.max(...contours.flat().map((p) => p.y));
    expect(maxY).toBeLessThanOrEqual(0.5); // small tolerance for rounding
  });

  it("an empty string produces no contours", () => {
    expect(getTextContours(font, "", 10, 0)).toHaveLength(0);
  });
});
