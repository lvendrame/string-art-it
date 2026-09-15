import type { PinPathGeometry } from "../../application/document";
import type { Point } from "../../domain/paths";
import { ensureFontLoaded } from "../../infrastructure/fonts/fontLoader";
import { getTextContours } from "../../infrastructure/fonts/textContours";
import type { FontWeight } from "../../infrastructure/fonts/fontCatalog";

export type TextPinPathGeometry = Extract<PinPathGeometry, { type: "text" }>;

// docs/specs/29-text-pin-path.md — the one place the UI (the only layer that touches
// both infrastructure and application for this feature) awaits a font and lays the
// string out into absolute contours. Called on every Font/Weight/Italic/Size/
// LetterSpacing/Text-content change (PinToolbar.tsx's Text tool placement click,
// SelectionPanel.tsx's text field group) — never for Move/Rotate/Scale, which transform
// the already-baked contours directly via the generic geometry functions in pinPath.ts.
// Always regenerates `rotation` back to 0: any manual rotate/scale baked into the
// previous contours is intentionally discarded on a content/font regenerate (documented
// scope note in the spec).
export async function buildTextGeometry(
  origin: Point,
  text: string,
  fontId: string,
  weight: FontWeight,
  italic: boolean,
  size: number,
  letterSpacing: number,
): Promise<TextPinPathGeometry> {
  const font = await ensureFontLoaded(fontId, weight, italic);
  const localContours = getTextContours(font, text, size, letterSpacing);
  const contours = localContours.map((contour) => contour.map((p) => ({ x: p.x + origin.x, y: p.y + origin.y })));
  return { type: "text", origin, text, fontId, weight, italic, size, letterSpacing, rotation: 0, contours };
}
