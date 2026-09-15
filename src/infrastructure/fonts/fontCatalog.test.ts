import { describe, expect, it } from "vitest";
import { FONT_CATALOG, resolveFontFileUrl } from "./fontCatalog";

describe("FONT_CATALOG", () => {
  it("has exactly 20 fonts spanning all 4 required categories", () => {
    expect(FONT_CATALOG).toHaveLength(20);
    const categories = new Set(FONT_CATALOG.map((f) => f.category));
    expect(categories).toEqual(new Set(["serif", "sans-serif", "cursive", "monospace"]));
  });

  it("every font id is unique", () => {
    const ids = FONT_CATALOG.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("resolveFontFileUrl", () => {
  it("resolves the plain regular file by default", () => {
    expect(resolveFontFileUrl("pt-sans", "regular", false)).toBe("/fonts/pt-sans/Regular.ttf");
  });

  it("resolves the bold file when the font has one", () => {
    expect(resolveFontFileUrl("pt-sans", "bold", false)).toBe("/fonts/pt-sans/Bold.ttf");
  });

  it("italic wins over weight — no combined Bold+Italic files are shipped", () => {
    expect(resolveFontFileUrl("pt-sans", "bold", true)).toBe("/fonts/pt-sans/Italic.ttf");
  });

  it("falls back to Regular when the requested weight isn't available (e.g. a script font with only Regular)", () => {
    expect(resolveFontFileUrl("pacifico", "bold", false)).toBe("/fonts/pacifico/Regular.ttf");
  });

  it("falls back to Regular when italic is requested but the font has none", () => {
    expect(resolveFontFileUrl("hind", "regular", true)).toBe("/fonts/hind/Regular.ttf");
  });

  it("throws on an unknown font id", () => {
    expect(() => resolveFontFileUrl("does-not-exist", "regular", false)).toThrow(/Unknown font id/);
  });
});
