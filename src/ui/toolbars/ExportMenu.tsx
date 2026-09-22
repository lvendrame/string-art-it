import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, Download, FileImage, FileType } from "lucide-react";
import { boardPath, type EditorStore } from "../../application/document";
import { pathBoundingBoxPoints } from "../../domain/paths";
import { boundingBoxOf } from "../../domain/transforms";
import { buildExportSvg } from "../../infrastructure/export/svgExport";
import { exportToRaster } from "../../infrastructure/export/rasterExport";
import { useEditorState } from "../useEditorStore";
import { AnchoredPopover } from "../AnchoredPopover";
import { usePopoverDismiss } from "../usePopoverDismiss";
import "./ExportMenu.css";

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
  const { t } = useTranslation(["menus", "errors"]);
  const state = useEditorState(store);
  const [open, setOpen] = useState(false);
  const [dpi, setDpi] = useState(150);
  const [busy, setBusy] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  usePopoverDismiss(containerRef, open, () => setOpen(false));

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
      window.alert(err instanceof Error ? err.message : t("export.rasterFailed", { ns: "errors" }));
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
      window.alert(err instanceof Error ? err.message : t("export.pdfFailed", { ns: "errors" }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div ref={containerRef} className="popover-trigger">
      <button className="btn export-menu__trigger" onClick={() => setOpen((o) => !o)} disabled={busy}>
        <Download size={14} />
        {t("export.trigger")}
        <ChevronDown size={12} />
      </button>
      {open && (
        <AnchoredPopover align="left" className="export-menu__panel">
          <button
            className="btn export-menu__item"
            onClick={() => {
              handleSvg();
              setOpen(false);
            }}
          >
            <FileType size={14} />
            {t("export.svg")}
          </button>
          <button
            className="btn export-menu__item"
            onClick={() => {
              handlePdf();
              setOpen(false);
            }}
          >
            <FileType size={14} />
            {t("export.pdf")}
          </button>
          <button
            className="btn export-menu__item"
            onClick={() => {
              handleRaster("png");
              setOpen(false);
            }}
          >
            <FileImage size={14} />
            {t("export.png", { dpi })}
          </button>
          <button
            className="btn export-menu__item"
            onClick={() => {
              handleRaster("jpeg");
              setOpen(false);
            }}
          >
            <FileImage size={14} />
            {t("export.jpeg", { dpi })}
          </button>
          <label className="export-menu__dpi-row">
            {t("export.dpi")}
            <input
              type="number"
              className="mono export-menu__dpi-input"
              min={72}
              max={600}
              step={1}
              value={dpi}
              onChange={(e) => setDpi(Number(e.target.value))}
            />
          </label>
        </AnchoredPopover>
      )}
    </div>
  );
}
