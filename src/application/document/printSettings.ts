// docs/specs/14-printing.md
export interface PrintElements {
  boardOutline: boolean;
  background: boolean;
  pins: boolean;
  pinGuides: boolean;
  pinNumbers: boolean;
  threads: boolean;
  grid: boolean;
}

export type PrintScaleMode = "1:1" | "fit" | "custom";
export interface PrintScale {
  mode: PrintScaleMode;
  customRatio: number; // e.g. 0.5 for "1:2", 1.25 for "125%"
}

export type PaperSize = "A4" | "A3" | "Letter" | "custom";
export type PaperOrientation = "portrait" | "landscape";
export interface PaperConfig {
  size: PaperSize;
  customWidthCm: number;
  customHeightCm: number;
  orientation: PaperOrientation;
}

// docs/specs/43-print-calibration (Phase 2) — a stored correction factor applied to
// future 1:1 prints, derived from a known reference length vs. what the user measured
// on the actual printed page.
export interface CalibrationSettings {
  correctionFactor: number;
}

// docs/specs/42-tiled-printing (Phase 2)
export interface TilingSettings {
  enabled: boolean;
  overlapCm: number;
  trimMarks: boolean;
  alignmentMarks: boolean;
  pageNumbers: boolean;
  pageCoordinates: boolean;
}

export interface PrintSettings {
  elements: PrintElements;
  scale: PrintScale;
  paper: PaperConfig;
  calibration: CalibrationSettings;
  tiling: TilingSettings;
}

export function defaultPrintSettings(): PrintSettings {
  return {
    elements: { boardOutline: true, background: true, pins: true, pinGuides: true, pinNumbers: false, threads: false, grid: false },
    scale: { mode: "fit", customRatio: 1 },
    paper: { size: "A4", customWidthCm: 21, customHeightCm: 29.7, orientation: "portrait" },
    calibration: { correctionFactor: 1 },
    tiling: { enabled: false, overlapCm: 1, trimMarks: true, alignmentMarks: true, pageNumbers: true, pageCoordinates: true },
  };
}

const PAPER_SIZES_CM: Record<Exclude<PaperSize, "custom">, { width: number; height: number }> = {
  A4: { width: 21, height: 29.7 },
  A3: { width: 29.7, height: 42 },
  Letter: { width: 21.59, height: 27.94 },
};

export function paperDimensionsCm(paper: PaperConfig): { width: number; height: number } {
  const base = paper.size === "custom" ? { width: paper.customWidthCm, height: paper.customHeightCm } : PAPER_SIZES_CM[paper.size];
  return paper.orientation === "landscape" ? { width: base.height, height: base.width } : base;
}

// docs/specs/40-print-scale — the effective board-cm -> paper-cm multiplier. The
// calibration correction factor (§43) applies only to 1:1 prints, per spec wording
// ("applied to future 1:1 prints").
export function computeEffectiveScale(
  scale: PrintScale,
  boardSizeCm: { width: number; height: number },
  paperSizeCm: { width: number; height: number },
  marginCm = 1,
  correctionFactor = 1,
): number {
  if (scale.mode === "1:1") return correctionFactor;
  if (scale.mode === "custom") return scale.customRatio;
  const availableWidth = Math.max(paperSizeCm.width - marginCm * 2, 0.1);
  const availableHeight = Math.max(paperSizeCm.height - marginCm * 2, 0.1);
  return Math.min(availableWidth / boardSizeCm.width, availableHeight / boardSizeCm.height);
}

// docs/specs/43-print-calibration: correctionFactor = requested / measured.
export function computeCorrectionFactor(requestedCm: number, measuredCm: number): number {
  if (measuredCm <= 0) return 1;
  return requestedCm / measuredCm;
}

export interface Tile {
  col: number;
  row: number;
  x: number; // top-left, in content (board-print) space, cm
  y: number;
  width: number;
  height: number;
}

// docs/specs/42-tiled-printing — splits printed content larger than one page into a
// grid of overlapping tiles. Each tile after the first starts `tileSize - overlap`
// further along, so adjacent pages share a physical overlap strip to align by hand.
export function computeTileGrid(
  contentSizeCm: { width: number; height: number },
  tileSizeCm: { width: number; height: number },
  overlapCm: number,
): { cols: number; rows: number; tiles: Tile[] } {
  const stepX = Math.max(tileSizeCm.width - overlapCm, 0.1);
  const stepY = Math.max(tileSizeCm.height - overlapCm, 0.1);
  const cols = Math.max(1, Math.ceil((contentSizeCm.width - overlapCm) / stepX));
  const rows = Math.max(1, Math.ceil((contentSizeCm.height - overlapCm) / stepY));

  const tiles: Tile[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      tiles.push({ col, row, x: col * stepX, y: row * stepY, width: tileSizeCm.width, height: tileSizeCm.height });
    }
  }
  return { cols, rows, tiles };
}
