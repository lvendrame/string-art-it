import type { Font } from "opentype.js";
import type { Point } from "../../domain/paths";
import { commandsToContours, type GlyphCommand } from "../../domain/text/glyphOutline";

// docs/plan M22 — Text Pin Path. Synchronous given an already-loaded Font (this is the
// piece that lets plain typing skip the async font-loading path entirely). Walks the
// string one character at a time — rather than calling Font.getPath(text, ...) once for
// the whole string — so each letter's contours advance by its own real width plus the
// user's letterSpacing, keeping "each letter is a different shape" true instead of
// opentype.js's own combined multi-glyph Path merging every letter's commands together.
export function getTextContours(font: Font, text: string, sizeDocUnits: number, letterSpacingDocUnits: number): Point[][] {
  const contours: Point[][] = [];
  let x = 0;
  for (const char of text) {
    // opentype.js's Glyph.getPath already negates the font's Y-up glyph-space Y
    // (see node_modules/opentype.js's `y + -cmd.y * yScale`), so the commands it
    // returns are already Y-down/SVG-native — ascenders come out negative, matching
    // this app's document space (Y-down, same as every other shape — PinPathVisual.tsx
    // draws raw document coordinates straight into an <svg>). No extra flip needed.
    const glyphPath = font.getPath(char, x, 0, sizeDocUnits);
    contours.push(...commandsToContours(glyphPath.commands as GlyphCommand[]));
    x += font.getAdvanceWidth(char, sizeDocUnits) + letterSpacingDocUnits;
  }
  return contours;
}
