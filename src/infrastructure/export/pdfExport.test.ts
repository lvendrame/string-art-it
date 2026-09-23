import { describe, expect, it, vi } from "vitest";
import { jsPDF } from "jspdf";
import { exportToPdf } from "./pdfExport";

// svg2pdf.js registers its `.svg()` method onto jsPDF.API, which jsPDF mixes onto each
// new instance at construction time (not onto jsPDF.prototype directly, which stays
// unset) — so the mock has to target jsPDF.API.svg, not jsPDF.prototype.svg. This still
// only exercises exportToPdf's own orchestration (parse the SVG, size the PDF, call
// .svg(), return the blob); svg2pdf.js's real DOM walk needs getBBox/getComputedStyle,
// which jsdom doesn't implement — see this file's own top-of-file note.
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="10cm" height="8cm" viewBox="0 0 10 8"><rect width="10" height="8"/></svg>`;

describe("exportToPdf", () => {
  it("constructs a jsPDF document sized to the given physical dimensions and returns its blob", async () => {
    const svgSpy = vi.spyOn(jsPDF.API, "svg").mockResolvedValue(undefined as unknown as jsPDF);

    const result = await exportToPdf(SVG, 10, 8);

    expect(svgSpy).toHaveBeenCalledTimes(1);
    const [element, opts] = svgSpy.mock.calls[0];
    expect(element.tagName.toLowerCase()).toBe("svg");
    expect(opts).toMatchObject({ x: 0, y: 0, width: 10, height: 8 });
    expect(result).toBeInstanceOf(Blob);
    expect(result.type).toBe("application/pdf");

    svgSpy.mockRestore();
  });
});
