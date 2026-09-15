// docs/plan M22 — Text Pin Path. Static manifest of the fonts shipped under
// public/fonts/ (see public/fonts/SOURCES.md for provenance/licensing — all SIL OFL
// 1.1 Google Fonts). Each family has a Regular file, an optional Bold file (the
// "Weight" field in the UI), and an optional Italic file (always the REGULAR weight's
// italic — no combined Bold+Italic files are shipped, to keep the file count sane; see
// docs/specs/29-text-pin-path.md).
export type FontCategory = "serif" | "sans-serif" | "cursive" | "monospace";
export type FontWeight = "regular" | "bold";

export interface FontCatalogEntry {
  id: string;
  family: string;
  category: FontCategory;
  weights: FontWeight[]; // always includes "regular"; "bold" only if that file exists
  hasItalic: boolean;
}

function fontUrl(id: string, file: "Regular" | "Bold" | "Italic"): string {
  return `/fonts/${id}/${file}.ttf`;
}

export const FONT_CATALOG: FontCatalogEntry[] = [
  { id: "lato", family: "Lato", category: "sans-serif", weights: ["regular", "bold"], hasItalic: true },
  { id: "poppins", family: "Poppins", category: "sans-serif", weights: ["regular", "bold"], hasItalic: true },
  { id: "pt-sans", family: "PT Sans", category: "sans-serif", weights: ["regular", "bold"], hasItalic: true },
  { id: "barlow", family: "Barlow", category: "sans-serif", weights: ["regular", "bold"], hasItalic: true },
  { id: "hind", family: "Hind", category: "sans-serif", weights: ["regular", "bold"], hasItalic: false },
  { id: "titillium-web", family: "Titillium Web", category: "sans-serif", weights: ["regular", "bold"], hasItalic: true },

  { id: "pt-serif", family: "PT Serif", category: "serif", weights: ["regular", "bold"], hasItalic: true },
  { id: "crimson-text", family: "Crimson Text", category: "serif", weights: ["regular", "bold"], hasItalic: true },
  { id: "arvo", family: "Arvo", category: "serif", weights: ["regular", "bold"], hasItalic: true },
  { id: "cardo", family: "Cardo", category: "serif", weights: ["regular", "bold"], hasItalic: true },
  { id: "tinos", family: "Tinos", category: "serif", weights: ["regular", "bold"], hasItalic: true },

  { id: "pacifico", family: "Pacifico", category: "cursive", weights: ["regular"], hasItalic: false },
  { id: "sacramento", family: "Sacramento", category: "cursive", weights: ["regular"], hasItalic: false },
  { id: "great-vibes", family: "Great Vibes", category: "cursive", weights: ["regular"], hasItalic: false },
  { id: "kaushan-script", family: "Kaushan Script", category: "cursive", weights: ["regular"], hasItalic: false },
  { id: "alex-brush", family: "Alex Brush", category: "cursive", weights: ["regular"], hasItalic: false },

  { id: "courier-prime", family: "Courier Prime", category: "monospace", weights: ["regular", "bold"], hasItalic: true },
  { id: "space-mono", family: "Space Mono", category: "monospace", weights: ["regular", "bold"], hasItalic: true },
  { id: "ibm-plex-mono", family: "IBM Plex Mono", category: "monospace", weights: ["regular", "bold"], hasItalic: true },
  { id: "anonymous-pro", family: "Anonymous Pro", category: "monospace", weights: ["regular", "bold"], hasItalic: true },
];

export const DEFAULT_FONT_ID = "pt-sans";

export function getFontCatalogEntry(fontId: string): FontCatalogEntry | undefined {
  return FONT_CATALOG.find((f) => f.id === fontId);
}

// Resolves which physical file backs a given (font, weight, italic) combination.
// Italic always wins over weight (no Bold+Italic files exist) — see module doc above.
// Falls back to Regular if the requested weight/italic isn't available for this font.
export function resolveFontFileUrl(fontId: string, weight: FontWeight, italic: boolean): string {
  const entry = getFontCatalogEntry(fontId);
  if (!entry) throw new Error(`Unknown font id: ${fontId}`);
  if (italic && entry.hasItalic) return fontUrl(fontId, "Italic");
  if (weight === "bold" && entry.weights.includes("bold")) return fontUrl(fontId, "Bold");
  return fontUrl(fontId, "Regular");
}
