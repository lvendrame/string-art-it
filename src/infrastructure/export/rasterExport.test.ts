import { describe, expect, it } from "vitest";
import { cmToPixels, rasterMimeType } from "./rasterExport";

// exportToRaster() itself draws through a real <canvas> 2D context, which jsdom does
// not implement (no actual rasterization backend) — untestable in this harness, same
// class of limitation as pdfExport.ts. These are the parts of the DPI/format contract
// that ARE pure and testable.
describe("cmToPixels", () => {
  it("converts centimetres to pixels at the given DPI", () => {
    expect(cmToPixels(2.54, 96)).toBe(96);
    expect(cmToPixels(1, 300)).toBe(Math.round(300 / 2.54));
  });
});

describe("rasterMimeType", () => {
  it("maps format to the correct MIME type", () => {
    expect(rasterMimeType("png")).toBe("image/png");
    expect(rasterMimeType("jpeg")).toBe("image/jpeg");
  });
});
