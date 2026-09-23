import { useState, type RefObject } from "react";
import type { Board } from "@application/document";
import { exportBoundingBox } from "@infrastructure/export/svgExport";
import { cmToPixels } from "@infrastructure/export/rasterExport";
import { drawSvgElementToCanvas, pickSupportedVideoMimeType, recordFramesToVideo } from "@infrastructure/export/videoExport";

const VIDEO_DPI = 150; // fixed — not user-configurable, matches the scope of the requested controls
const VIDEO_FPS = 30;

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function waitForPaint(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}

// docs/specs/19-play-mode.md Export to Video — drives the SAME on-screen playback
// canvas through every frame via `goToFrame` (visibly "plays through" during export)
// rather than a hidden duplicate; simpler, and lets the user watch it export.
export function useVideoExport(
  svgRef: RefObject<SVGSVGElement | null>,
  board: Board,
  totalFrames: number,
  intervalMs: number,
  goToFrame: (frame: number) => void,
) {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const supported = pickSupportedVideoMimeType() !== null;

  async function exportVideo(): Promise<void> {
    const mimeType = pickSupportedVideoMimeType();
    if (!mimeType || totalFrames === 0 || !svgRef.current) return;
    const box = exportBoundingBox(board);
    const widthPx = cmToPixels(box.width, VIDEO_DPI);
    const heightPx = cmToPixels(box.height, VIDEO_DPI);
    setIsExporting(true);
    setProgress(0);
    try {
      const blob = await recordFramesToVideo({
        widthPx,
        heightPx,
        fps: VIDEO_FPS,
        mimeType,
        totalFrames,
        intervalMs,
        drawFrame: async (frame, ctx) => {
          goToFrame(frame);
          await waitForPaint();
          await drawSvgElementToCanvas(svgRef.current!, ctx, widthPx, heightPx);
        },
        onProgress: setProgress,
      });
      downloadBlob(blob, "string-art-animation.webm");
    } finally {
      setIsExporting(false);
    }
  }

  return { isExporting, progress, supported, exportVideo };
}
