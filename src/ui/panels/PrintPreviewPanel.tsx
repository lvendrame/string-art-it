import { useEffect, useMemo, useState } from "react";
import {
  boardPath,
  computeCorrectionFactor,
  computeEffectiveScale,
  computeTileGrid,
  geometryToPath,
  paperDimensionsCm,
  type EditorState,
  type EditorStore,
  type PaperOrientation,
  type PaperSize,
  type PrintElements,
  type PrintScaleMode,
} from "../../application/document";
import { pathBoundingBoxPoints } from "../../domain/paths";
import { boundingBoxOf, CSS_PIXELS_PER_CM, type BoundingBox } from "../../domain/transforms";
import { boardFillPaint, BoardFillDefs } from "../../infrastructure/rendering/boardFill";
import { pathToSvgD } from "../../infrastructure/rendering/svgPath";
import { useEditorState } from "../useEditorStore";

const ELEMENT_LABELS: { key: keyof PrintElements; label: string }[] = [
  { key: "boardOutline", label: "Board outline" },
  { key: "background", label: "Background" },
  { key: "pins", label: "Pins" },
  { key: "pinGuides", label: "Pin guide lines" },
  { key: "pinNumbers", label: "Pin numbers" },
  { key: "threads", label: "Threads" },
  { key: "grid", label: "Grid" },
];

// docs/specs/14-printing.md — printed/on-screen-preview pages both use the CSS
// reference-pixel/cm ratio (96dpi ÷ 2.54, same anchor as the editor zoom baseline) so
// what prints is physically true to the selected paper size, not an arbitrary UI scale.
const PRINT_PX_PER_CM = CSS_PIXELS_PER_CM;
const CALIBRATION_LENGTH_CM = 10;

// docs/specs/14-printing.md + Phase 2 §42/§43 (tiling, calibration) — print visibility
// is entirely independent from editor visibility: this panel reads only
// `state.printSettings`, never `pinPath.guideVisible` or the grid's editor toggle.
export function PrintPreviewPanel({ store, onClose }: { store: EditorStore; onClose: () => void }) {
  const state = useEditorState(store);
  const { elements, scale, paper, calibration, tiling } = state.printSettings;
  const [calibrating, setCalibrating] = useState(false);
  const [measuredCm, setMeasuredCm] = useState(CALIBRATION_LENGTH_CM);

  const path = useMemo(() => boardPath(state.board), [state.board]);
  const box = useMemo(() => boundingBoxOf(pathBoundingBoxPoints(path)), [path]);
  const boardSize = { width: box.maxX - box.minX, height: box.maxY - box.minY };
  const paperSize = paperDimensionsCm(paper);
  const effectiveScale = computeEffectiveScale(scale, boardSize, paperSize, 1, calibration.correctionFactor);

  const printedSize = { width: boardSize.width * effectiveScale, height: boardSize.height * effectiveScale };
  const marginCm = 1;
  const tileContentAreaCm = { width: paperSize.width - marginCm * 2, height: paperSize.height - marginCm * 2 };
  const needsTiling = tiling.enabled && (printedSize.width > tileContentAreaCm.width || printedSize.height > tileContentAreaCm.height);
  const grid = needsTiling ? computeTileGrid(printedSize, tileContentAreaCm, tiling.overlapCm) : null;

  usePrintPageSize(paperSize);

  function applyCalibration() {
    const factor = computeCorrectionFactor(CALIBRATION_LENGTH_CM, measuredCm);
    store.setPrintSettings({ calibration: { correctionFactor: factor } });
    setCalibrating(false);
  }

  return (
    <div style={{ position: "absolute", inset: 0, background: "var(--bg-app)", display: "flex", zIndex: 10 }}>
      <div style={{ width: 300, borderRight: "1px solid var(--border)", padding: 16, display: "flex", flexDirection: "column", gap: 16, overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 700, fontSize: 13 }}>Print Preview</span>
          <button className="btn" onClick={onClose} style={{ borderRadius: 6, padding: "4px 8px", fontSize: 12 }}>Close</button>
        </div>

        <Section title="Print Elements">
          {ELEMENT_LABELS.map(({ key, label }) => (
            <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-secondary)" }}>
              <input
                type="checkbox"
                checked={elements[key]}
                onChange={(e) => store.setPrintSettings({ elements: { ...elements, [key]: e.target.checked } })}
              />
              {label}
            </label>
          ))}
        </Section>

        <Section title="Scale">
          {(["1:1", "fit", "custom"] as PrintScaleMode[]).map((mode) => (
            <label key={mode} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-secondary)" }}>
              <input type="radio" name="scale-mode" checked={scale.mode === mode} onChange={() => store.setPrintSettings({ scale: { ...scale, mode } })} />
              {mode === "1:1" ? "Actual size / 1:1" : mode === "fit" ? "Fit to page" : "Custom scale"}
            </label>
          ))}
          {scale.mode === "custom" && (
            <input
              type="number"
              className="mono"
              step={0.05}
              value={scale.customRatio}
              onChange={(e) => store.setPrintSettings({ scale: { ...scale, customRatio: Number(e.target.value) } })}
              style={{ width: 80, background: "var(--bg-panel-2)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", padding: "4px 6px" }}
            />
          )}
          <div className="mono" style={{ fontSize: 11, color: "var(--accent)" }}>Effective: {effectiveScale.toFixed(3)}x</div>
        </Section>

        <Section title="Paper">
          <select
            value={paper.size}
            onChange={(e) => store.setPrintSettings({ paper: { ...paper, size: e.target.value as PaperSize } })}
            style={{ background: "var(--bg-panel-2)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", padding: "4px 6px", fontSize: 12 }}
          >
            <option value="A4">A4</option>
            <option value="A3">A3</option>
            <option value="Letter">Letter</option>
            <option value="custom">Custom</option>
          </select>
          <div style={{ display: "flex", gap: 6 }}>
            {(["portrait", "landscape"] as PaperOrientation[]).map((o) => (
              <button
                key={o}
                className={`btn${paper.orientation === o ? " btn-active" : ""}`}
                onClick={() => store.setPrintSettings({ paper: { ...paper, orientation: o } })}
                style={{ flex: 1, justifyContent: "center", borderRadius: 6, padding: 6, fontSize: 11.5 }}
              >
                {o}
              </button>
            ))}
          </div>
        </Section>

        <Section title="Calibration">
          <div className="mono" style={{ fontSize: 11, color: "var(--text-secondary)" }}>
            Correction factor: <span style={{ color: "var(--accent)" }}>{calibration.correctionFactor.toFixed(4)}</span>
          </div>
          {!calibrating ? (
            <button className="btn" onClick={() => setCalibrating(true)} style={{ justifyContent: "center", borderRadius: 6, padding: 8, fontSize: 12 }}>
              Print calibration test
            </button>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, background: "var(--bg-app)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: 10 }}>
              <span style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>Print the {CALIBRATION_LENGTH_CM} cm reference line, measure the printed result, then enter it below.</span>
              <button className="btn" onClick={() => window.print()} style={{ justifyContent: "center", borderRadius: 6, padding: 7, fontSize: 12 }}>Print reference</button>
              <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "var(--text-secondary)" }}>
                Measured (cm)
                <input
                  type="number"
                  className="mono"
                  step={0.01}
                  value={measuredCm}
                  onChange={(e) => setMeasuredCm(Number(e.target.value))}
                  style={{ width: 70, background: "var(--bg-panel-2)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", padding: "4px 6px" }}
                />
              </label>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn" onClick={applyCalibration} style={{ flex: 1, justifyContent: "center", borderRadius: 6, padding: 7, fontSize: 12, fontWeight: 600 }}>Apply</button>
                <button className="btn" onClick={() => setCalibrating(false)} style={{ flex: 1, justifyContent: "center", borderRadius: 6, padding: 7, fontSize: 12 }}>Cancel</button>
              </div>
            </div>
          )}
        </Section>

        <Section title="Tiling">
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-secondary)" }}>
            <input type="checkbox" checked={tiling.enabled} onChange={(e) => store.setPrintSettings({ tiling: { ...tiling, enabled: e.target.checked } })} />
            Enable tiling across multiple pages
          </label>
          {tiling.enabled && (
            <>
              <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "var(--text-secondary)" }}>
                Overlap (cm)
                <input
                  type="number"
                  className="mono"
                  min={0}
                  step={0.5}
                  value={tiling.overlapCm}
                  onChange={(e) => store.setPrintSettings({ tiling: { ...tiling, overlapCm: Number(e.target.value) } })}
                  style={{ width: 70, background: "var(--bg-panel-2)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", padding: "4px 6px" }}
                />
              </label>
              {(["trimMarks", "alignmentMarks", "pageNumbers", "pageCoordinates"] as const).map((key) => (
                <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-secondary)" }}>
                  <input type="checkbox" checked={tiling[key]} onChange={(e) => store.setPrintSettings({ tiling: { ...tiling, [key]: e.target.checked } })} />
                  {key === "trimMarks" ? "Trim marks" : key === "alignmentMarks" ? "Alignment marks" : key === "pageNumbers" ? "Page numbers" : "Page coordinates"}
                </label>
              ))}
              {grid && <div className="mono" style={{ fontSize: 11, color: "var(--accent)" }}>{grid.cols * grid.rows} pages ({grid.cols} × {grid.rows})</div>}
            </>
          )}
        </Section>

        <button
          className="btn"
          onClick={() => window.print()}
          style={{ justifyContent: "center", borderRadius: "var(--radius-sm)", padding: 10, fontSize: 13, fontWeight: 700, background: "var(--accent)", color: "white", borderColor: "transparent" }}
        >
          Print
        </button>
      </div>

      <div className="print-pages" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", overflow: "auto", padding: 24 }}>
        {calibrating ? (
          <div className="print-page">
            <CalibrationPage paperSize={paperSize} />
          </div>
        ) : grid ? (
          <div className="print-tile-grid" style={{ display: "grid", gridTemplateColumns: `repeat(${grid.cols}, auto)`, gap: 16 }}>
            {grid.tiles.map((tile) => (
              <PrintPage
                key={`${tile.col}-${tile.row}`}
                state={state}
                path={path}
                box={box}
                paperSize={paperSize}
                effectiveScale={effectiveScale}
                tileOffsetCm={{ x: tile.x, y: tile.y }}
                tileLabel={tiling.pageNumbers ? `${tile.row * grid.cols + tile.col + 1}` : undefined}
                coordLabel={tiling.pageCoordinates ? `${String.fromCharCode(65 + tile.row)}${tile.col + 1}` : undefined}
                trimMarks={tiling.trimMarks}
                alignmentMarks={tiling.alignmentMarks}
              />
            ))}
          </div>
        ) : (
          <PrintPage state={state} path={path} box={box} paperSize={paperSize} effectiveScale={effectiveScale} />
        )}
      </div>
    </div>
  );
}

// Chrome's print dialog otherwise falls back to whatever paper size/orientation it
// last used, ignoring the Paper section here — so the selected size is pushed into an
// @page rule for the duration this panel is open.
function usePrintPageSize(paperSize: { width: number; height: number }) {
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `@media print { @page { size: ${paperSize.width}cm ${paperSize.height}cm; } }`;
    document.head.appendChild(style);
    return () => style.remove();
  }, [paperSize.width, paperSize.height]);
}

function CalibrationPage({ paperSize }: { paperSize: { width: number; height: number } }) {
  const paperPx = { width: paperSize.width * PRINT_PX_PER_CM, height: paperSize.height * PRINT_PX_PER_CM };
  const lineY = paperPx.height / 2;
  const lineStartX = (paperPx.width - CALIBRATION_LENGTH_CM * PRINT_PX_PER_CM) / 2;
  const lineEndX = lineStartX + CALIBRATION_LENGTH_CM * PRINT_PX_PER_CM;
  return (
    <svg width={paperPx.width} height={paperPx.height} style={{ background: "white" }}>
      <line x1={lineStartX} y1={lineY} x2={lineEndX} y2={lineY} stroke="black" strokeWidth={1.5} />
      <line x1={lineStartX} y1={lineY - 8} x2={lineStartX} y2={lineY + 8} stroke="black" strokeWidth={1.5} />
      <line x1={lineEndX} y1={lineY - 8} x2={lineEndX} y2={lineY + 8} stroke="black" strokeWidth={1.5} />
      <text x={(lineStartX + lineEndX) / 2} y={lineY - 16} textAnchor="middle" fontSize={14} fill="black">
        {CALIBRATION_LENGTH_CM} cm
      </text>
    </svg>
  );
}

// One physical page's worth of board content, offset by `tileOffsetCm` (used when
// tiling splits the printed board across multiple pages).
function PrintPage({
  state,
  path,
  box,
  paperSize,
  effectiveScale,
  tileOffsetCm,
  tileLabel,
  coordLabel,
  trimMarks,
  alignmentMarks,
}: {
  state: EditorState;
  path: ReturnType<typeof boardPath>;
  box: BoundingBox;
  paperSize: { width: number; height: number };
  effectiveScale: number;
  tileOffsetCm?: { x: number; y: number };
  tileLabel?: string;
  coordLabel?: string;
  trimMarks?: boolean;
  alignmentMarks?: boolean;
}) {
  const { elements } = state.printSettings;
  const paperPx = { width: paperSize.width * PRINT_PX_PER_CM, height: paperSize.height * PRINT_PX_PER_CM };
  const boardCenter = { x: (box.minX + box.maxX) / 2, y: (box.minY + box.maxY) / 2 };
  // Content origin: board centre maps to paper centre, then the tile's offset shifts
  // that origin so each page shows a different slice of the printed-size content.
  const originPx = {
    x: (paperSize.width / 2 - (tileOffsetCm?.x ?? 0)) * PRINT_PX_PER_CM,
    y: (paperSize.height / 2 - (tileOffsetCm?.y ?? 0)) * PRINT_PX_PER_CM,
  };
  const clipId = `tile-clip-${tileLabel ?? "single"}-${coordLabel ?? ""}`;

  return (
    <div className="print-page" style={{ position: "relative" }}>
      <svg width={paperPx.width} height={paperPx.height} style={{ background: "white" }}>
        <defs>
          <clipPath id={clipId}>
            <rect x={0} y={0} width={paperPx.width} height={paperPx.height} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clipId})`}>
          <g transform={`translate(${originPx.x}, ${originPx.y}) scale(${effectiveScale * PRINT_PX_PER_CM}) translate(${-boardCenter.x}, ${-boardCenter.y})`}>
            <defs>{elements.background && <BoardFillDefs id={`print-fill-${clipId}`} appearance={state.board.appearance} />}</defs>
            {elements.grid && (
              <g opacity={0.15}>
                {Array.from({ length: 200 }, (_, i) => i - 100).map((i) => (
                  <line key={`v${i}`} x1={i} y1={-500} x2={i} y2={500} stroke="black" strokeWidth={0.02} />
                ))}
              </g>
            )}
            {elements.boardOutline && (
              <path d={pathToSvgD(path)} fill={elements.background ? boardFillPaint(`print-fill-${clipId}`, state.board.appearance) : "none"} stroke="black" strokeWidth={0.05} />
            )}
            {state.pinLayers.flatMap((l) =>
              l.pinPaths.map((p) => (
                <g key={p.id}>
                  {elements.pinGuides && <path d={pathToSvgD(geometryToPath(p.geometry))} fill="none" stroke="black" strokeOpacity={0.8} strokeWidth={0.03} strokeDasharray="0.15 0.1" />}
                  {elements.pins &&
                    p.pins.map((pin, i) => (
                      <g key={pin.id}>
                        <circle cx={pin.x} cy={pin.y} r={0.06} fill="black" />
                        {elements.pinNumbers && (
                          <text x={pin.x + 0.1} y={pin.y - 0.1} fontSize={0.15} fill="black">{i + 1}</text>
                        )}
                      </g>
                    ))}
                </g>
              )),
            )}
            {elements.threads &&
              state.threadLayers.flatMap((l) =>
                l.threadPaths.map((t) => {
                  const points = t.pinIds
                    .map((id) => state.pinLayers.flatMap((pl) => pl.pinPaths).flatMap((p) => p.pins).find((p) => p.id === id))
                    .filter((p): p is NonNullable<typeof p> => !!p);
                  if (points.length < 2) return null;
                  const d = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
                  return <path key={t.id} d={d} fill="none" stroke={t.colours[0]} strokeWidth={0.03} />;
                }),
              )}
          </g>
        </g>

        {trimMarks && (
          <g stroke="black" strokeWidth={1} opacity={0.6}>
            <line x1={0} y1={12} x2={12} y2={12} />
            <line x1={12} y1={0} x2={12} y2={12} />
            <line x1={paperPx.width - 12} y1={12} x2={paperPx.width} y2={12} />
            <line x1={paperPx.width - 12} y1={0} x2={paperPx.width - 12} y2={12} />
            <line x1={0} y1={paperPx.height - 12} x2={12} y2={paperPx.height - 12} />
            <line x1={12} y1={paperPx.height - 12} x2={12} y2={paperPx.height} />
            <line x1={paperPx.width - 12} y1={paperPx.height - 12} x2={paperPx.width} y2={paperPx.height - 12} />
            <line x1={paperPx.width - 12} y1={paperPx.height - 12} x2={paperPx.width - 12} y2={paperPx.height} />
          </g>
        )}
        {alignmentMarks && (
          <g stroke="black" strokeWidth={1} opacity={0.5}>
            <line x1={paperPx.width / 2 - 6} y1={paperPx.height / 2} x2={paperPx.width / 2 + 6} y2={paperPx.height / 2} />
            <line x1={paperPx.width / 2} y1={paperPx.height / 2 - 6} x2={paperPx.width / 2} y2={paperPx.height / 2 + 6} />
          </g>
        )}
        {(tileLabel || coordLabel) && (
          <text x={paperPx.width - 8} y={paperPx.height - 8} textAnchor="end" fontSize={11} fill="black" opacity={0.7}>
            {[coordLabel, tileLabel].filter(Boolean).join(" · ")}
          </text>
        )}
      </svg>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--text-tertiary)", textTransform: "uppercase" }}>{title}</div>
      {children}
    </div>
  );
}
