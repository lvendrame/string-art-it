// docs/specs/15-export.md PNG/JPEG — raster exports need a resolution (DPI) since
// document coordinates are physical, not pixel-based (docs/specs/05-canvas-and-
// viewport.md). Rasterizes the same SVG the vector exporters use, so PNG/JPEG never
// drift from what SVG/PDF export.
export function cmToPixels(cm: number, dpi: number): number {
  return Math.round((cm / 2.54) * dpi);
}

export interface RasterExportOptions {
  widthCm: number;
  heightCm: number;
  dpi: number;
  format: "png" | "jpeg";
}

// Split out from exportToRaster so the pixel-dimension/mime-type logic (the part that
// actually encodes this spec's rules) can be unit-tested without a real browser
// canvas — jsdom's canvas 2D context does not rasterize.
export function rasterMimeType(format: RasterExportOptions["format"]): string {
  return format === "png" ? "image/png" : "image/jpeg";
}

export async function exportToRaster(svgMarkup: string, options: RasterExportOptions): Promise<Blob> {
  const widthPx = cmToPixels(options.widthCm, options.dpi);
  const heightPx = cmToPixels(options.heightCm, options.dpi);

  const svgBlob = new Blob([svgMarkup], { type: "image/svg+xml" });
  const url = URL.createObjectURL(svgBlob);
  try {
    const image = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = widthPx;
    canvas.height = heightPx;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable.");
    if (options.format === "jpeg") {
      ctx.fillStyle = "white"; // JPEG has no alpha channel — flatten onto white first.
      ctx.fillRect(0, 0, widthPx, heightPx);
    }
    ctx.drawImage(image, 0, 0, widthPx, heightPx);

    const mime = rasterMimeType(options.format);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Rasterization failed."))), mime, 0.95);
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load SVG for rasterization."));
    img.src = src;
  });
}
