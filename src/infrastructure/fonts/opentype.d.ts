// Minimal ambient typing for the narrow slice of opentype.js this app actually uses.
// @types/opentype.js on npm targets opentype.js's 1.x API surface and is unmaintained
// against 2.x (see docs/plan M22 — Text Pin Path); rather than depend on a stale,
// possibly-mismatched community package for four functions, this declares just what's
// called in fontLoader.ts / textContours.ts.
declare module "opentype.js" {
  export interface GlyphPathCommand {
    type: "M" | "L" | "C" | "Q" | "Z";
    x?: number;
    y?: number;
    x1?: number;
    y1?: number;
    x2?: number;
    y2?: number;
  }

  export interface Path {
    commands: GlyphPathCommand[];
  }

  export interface Font {
    unitsPerEm: number;
    getPath(text: string, x: number, y: number, fontSize: number): Path;
    getAdvanceWidth(text: string, fontSize: number): number;
  }

  export function parse(buffer: ArrayBuffer): Font;
}
