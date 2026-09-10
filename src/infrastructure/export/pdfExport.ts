import { jsPDF } from "jspdf";
// Side-effect import: registers svg2pdf.js's `.svg()` method onto jsPDF's prototype.
// This is the library's documented usage — the named `svg2pdf()` export requires the
// same registration to have happened first, so importing for side effects is required
// either way (https://github.com/yWorks/svg2pdf.js#usage).
import "svg2pdf.js";

// docs/specs/15-export.md "PDF should preserve vector geometry wherever possible" —
// svg2pdf.js walks the SVG DOM and emits real vector path operators into the PDF
// content stream, rather than rasterizing. Parses the SAME markup buildExportSvg
// produces, so PDF never drifts from SVG export.
//
// Known limitation (upstream, documented): svg2pdf.js requires a fully functional DOM
// and explicitly does not work under jsdom (getBBox/getComputedStyle etc. are missing)
// — this function cannot be exercised by this project's jsdom-based test suite. See
// docs/plan/orchestrator.md M10 notes.
export async function exportToPdf(svgMarkup: string, widthCm: number, heightCm: number): Promise<Blob> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgMarkup, "image/svg+xml");
  const svgElement = doc.documentElement as unknown as SVGSVGElement;

  const pdf = new jsPDF({ unit: "cm", format: [widthCm, heightCm] });
  await pdf.svg(svgElement, { x: 0, y: 0, width: widthCm, height: heightCm });

  return pdf.output("blob");
}
