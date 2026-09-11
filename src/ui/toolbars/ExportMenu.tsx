import { useState } from "react";
import { ChevronDown, Download, FileImage, FileType } from "lucide-react";
import { boardPath, type EditorStore } from "../../application/document";
import { pathBoundingBoxPoints } from "../../domain/paths";
import { boundingBoxOf } from "../../domain/transforms";
import { buildExportSvg } from "../../infrastructure/export/svgExport";
import { exportToRaster } from "../../infrastructure/export/rasterExport";
import { useEditorState } from "../useEditorStore";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// docs/specs/15-export.md — SVG/PDF preserve vector geometry; PNG/JPEG are rasterized
// at a chosen DPI. Native project export is already covered by FileMenu's Save.
export function ExportMenu({ store }: { store: EditorStore }) {
  const state = useEditorState(store);
  const [open, setOpen] = useState(false);
  const [dpi, setDpi] = useState(150);
  const [busy, setBusy] = useState(false);

  function boardSizeCm() {
    const path = boardPath(state.board);
    const box = boundingBoxOf(pathBoundingBoxPoints(path));
    return { width: box.maxX - box.minX + 4, height: box.maxY - box.minY + 4 };
  }

  function handleSvg() {
    const svg = buildExportSvg(state, state.printSettings.elements);
    downloadBlob(new Blob([svg], { type: "image/svg+xml" }), "string-art-design.svg");
  }

  async function handleRaster(format: "png" | "jpeg") {
    setBusy(true);
    try {
      const svg = buildExportSvg(state, state.printSettings.elements);
      const size = boardSizeCm();
      const blob = await exportToRaster(svg, { widthCm: size.width, heightCm: size.height, dpi, format });
      downloadBlob(blob, `string-art-design.${format === "jpeg" ? "jpg" : "png"}`);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handlePdf() {
    setBusy(true);
    try {
      const svg = buildExportSvg(state, state.printSettings.elements);
      const size = boardSizeCm();
      // Dynamic import: svg2pdf.js has real-DOM requirements (see infrastructure/
      // export/pdfExport.ts) and pulls in a sizable library — load it only when the
      // user actually asks for a PDF.
      const { exportToPdf } = await import("../../infrastructure/export/pdfExport");
      const blob = await exportToPdf(svg, size.width, size.height);
      downloadBlob(blob, "string-art-design.pdf");
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "PDF export failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ position: "relative" }}>
      <button className="btn" onClick={() => setOpen((o) => !o)} style={{ borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 600, gap: 6 }} disabled={busy}>
        <Download size={14} />
        Export
        <ChevronDown size={12} />
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "110%",
            left: 0,
            zIndex: 20,
            background: "var(--bg-panel)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            padding: 10,
            display: "flex",
            flexDirection: "column",
            gap: 6,
            minWidth: 180,
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          }}
        >
          <button className="btn" onClick={() => { handleSvg(); setOpen(false); }} style={{ justifyContent: "flex-start", borderRadius: 6, padding: 8, fontSize: 12, gap: 6 }}>
            <FileType size={14} />
            SVG (vector)
          </button>
          <button className="btn" onClick={() => { handlePdf(); setOpen(false); }} style={{ justifyContent: "flex-start", borderRadius: 6, padding: 8, fontSize: 12, gap: 6 }}>
            <FileType size={14} />
            PDF (vector)
          </button>
          <button className="btn" onClick={() => { handleRaster("png"); setOpen(false); }} style={{ justifyContent: "flex-start", borderRadius: 6, padding: 8, fontSize: 12, gap: 6 }}>
            <FileImage size={14} />
            PNG ({dpi} DPI)
          </button>
          <button className="btn" onClick={() => { handleRaster("jpeg"); setOpen(false); }} style={{ justifyContent: "flex-start", borderRadius: 6, padding: 8, fontSize: 12, gap: 6 }}>
            <FileImage size={14} />
            JPEG ({dpi} DPI)
          </button>
          <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11.5, color: "var(--text-secondary)", marginTop: 4 }}>
            DPI
            <input
              type="number"
              className="mono"
              min={72}
              max={600}
              step={1}
              value={dpi}
              onChange={(e) => setDpi(Number(e.target.value))}
              style={{ width: 60, background: "var(--bg-panel-2)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", padding: "3px 6px" }}
            />
          </label>
        </div>
      )}
    </div>
  );
}
