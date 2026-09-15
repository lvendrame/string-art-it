import { useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import {
  boardPath,
  computeCorrectionFactor,
  computeEffectiveScale,
  computeMirroredPinGroups,
  computeTileGrid,
  findPinById,
  geometryCenter,
  geometryToContourPaths,
  paperDimensionsCm,
  type EditorState,
  type EditorStore,
  type PaperOrientation,
  type PaperSize,
  type PinPath,
  type PrintElements,
  type PrintScaleMode,
} from "../../application/document";
import { pathBoundingBoxPoints, type Point } from "../../domain/paths";
import { generateRadialCopies, mirrorCopies } from "../../domain/symmetry";
import {
  boundingBoxOf,
  CSS_PIXELS_PER_CM,
  type BoundingBox,
} from "../../domain/transforms";
import {
  boardFillPaint,
  BoardFillDefs,
} from "../../infrastructure/rendering/boardFill";
import { pathToSvgD } from "../../infrastructure/rendering/svgPath";
import { useEditorState } from "../useEditorStore";

function elementLabels(
  t: TFunction<"printPreview">,
): { key: keyof PrintElements; label: string }[] {
  return [
    { key: "boardOutline", label: t("elements.boardOutline") },
    { key: "background", label: t("elements.background") },
    { key: "pins", label: t("elements.pins") },
    { key: "pinGuides", label: t("elements.pinGuides") },
    { key: "pinNumbers", label: t("elements.pinNumbers") },
    { key: "threads", label: t("elements.threads") },
    { key: "grid", label: t("elements.grid") },
  ];
}

// docs/specs/14-printing.md — printed/on-screen-preview pages both use the CSS
// reference-pixel/cm ratio (96dpi ÷ 2.54, same anchor as the editor zoom baseline) so
// what prints is physically true to the selected paper size, not an arbitrary UI scale.
const PRINT_PX_PER_CM = CSS_PIXELS_PER_CM;
const CALIBRATION_LENGTH_CM = 10;
const MIN_PIN_DOT_RADIUS_PX = 1.5;
const MIN_PIN_NUMBER_FONT_PX = 7;
const PIN_NUMBER_GAP_PX = 4;
const MIN_GRID_STROKE_PX = 1;
const GRID_OPACITY = 0.4;

// docs/specs/14-printing.md + Phase 2 §42/§43 (tiling, calibration) — print visibility
// is entirely independent from editor visibility: this panel reads only
// `state.printSettings`, never `pinPath.guideVisible` or the grid's editor toggle.
export function PrintPreviewPanel({
  store,
  onClose,
}: {
  store: EditorStore;
  onClose: () => void;
}) {
  const { t } = useTranslation(["printPreview", "common"]);
  const state = useEditorState(store);
  const { elements, scale, paper, calibration, tiling } = state.printSettings;
  const [calibrating, setCalibrating] = useState(false);
  const [measuredCm, setMeasuredCm] = useState(CALIBRATION_LENGTH_CM);
  const labels = elementLabels(t);

  const path = useMemo(() => boardPath(state.board), [state.board]);
  const box = useMemo(() => boundingBoxOf(pathBoundingBoxPoints(path)), [path]);
  const boardSize = { width: box.maxX - box.minX, height: box.maxY - box.minY };
  const paperSize = paperDimensionsCm(paper);
  const effectiveScale = computeEffectiveScale(
    scale,
    boardSize,
    paperSize,
    1,
    calibration.correctionFactor,
  );

  const printedSize = {
    width: boardSize.width * effectiveScale,
    height: boardSize.height * effectiveScale,
  };
  const marginCm = 1;
  const tileContentAreaCm = {
    width: paperSize.width - marginCm * 2,
    height: paperSize.height - marginCm * 2,
  };
  const needsTiling =
    tiling.enabled &&
    (printedSize.width > tileContentAreaCm.width ||
      printedSize.height > tileContentAreaCm.height);
  const grid = needsTiling
    ? computeTileGrid(printedSize, tileContentAreaCm, tiling.overlapCm)
    : null;

  usePrintPageSize(paperSize);

  function applyCalibration() {
    const factor = computeCorrectionFactor(CALIBRATION_LENGTH_CM, measuredCm);
    store.setPrintSettings({ calibration: { correctionFactor: factor } });
    setCalibrating(false);
  }

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "var(--bg-app)",
        display: "flex",
        zIndex: 10,
      }}
    >
      <div
        style={{
          width: 300,
          borderRight: "1px solid var(--border)",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 16,
          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontWeight: 700, fontSize: 13 }}>
            {t("panelTitle")}
          </span>
          <button
            className="btn"
            onClick={onClose}
            style={{ borderRadius: 6, padding: "4px 8px", fontSize: 12 }}
          >
            {t("actions.close", { ns: "common" })}
          </button>
        </div>

        <Section title={t("sections.printElements")}>
          {labels.map(({ key, label }) => (
            <label
              key={key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12,
                color: "var(--text-secondary)",
              }}
            >
              <input
                type="checkbox"
                checked={elements[key]}
                onChange={(e) =>
                  store.setPrintSettings({
                    elements: { ...elements, [key]: e.target.checked },
                  })
                }
              />
              {label}
            </label>
          ))}
        </Section>

        <Section title={t("sections.scale")}>
          {(["1:1", "fit", "custom"] as PrintScaleMode[]).map((mode) => (
            <label
              key={mode}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12,
                color: "var(--text-secondary)",
              }}
            >
              <input
                type="radio"
                name="scale-mode"
                checked={scale.mode === mode}
                onChange={() =>
                  store.setPrintSettings({ scale: { ...scale, mode } })
                }
              />
              {mode === "1:1"
                ? t("scaleModes.actualSize")
                : mode === "fit"
                  ? t("scaleModes.fit")
                  : t("scaleModes.custom")}
            </label>
          ))}
          {scale.mode === "custom" && (
            <input
              type="number"
              className="mono"
              step={0.05}
              value={scale.customRatio}
              onChange={(e) =>
                store.setPrintSettings({
                  scale: { ...scale, customRatio: Number(e.target.value) },
                })
              }
              style={{
                width: 80,
                background: "var(--bg-panel-2)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                color: "var(--text-primary)",
                padding: "4px 6px",
              }}
            />
          )}
          <div
            className="mono"
            style={{ fontSize: 11, color: "var(--accent)" }}
          >
            {t("effective", { value: effectiveScale.toFixed(3) })}
          </div>
        </Section>

        <Section title={t("sections.paper")}>
          <select
            value={paper.size}
            onChange={(e) =>
              store.setPrintSettings({
                paper: { ...paper, size: e.target.value as PaperSize },
              })
            }
            style={{
              background: "var(--bg-panel-2)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              color: "var(--text-primary)",
              padding: "4px 6px",
              fontSize: 12,
            }}
          >
            <option value="A4">{t("paperSizes.A4")}</option>
            <option value="A3">{t("paperSizes.A3")}</option>
            <option value="Letter">{t("paperSizes.Letter")}</option>
            <option value="custom">{t("paperSizes.custom")}</option>
          </select>
          <div style={{ display: "flex", gap: 6 }}>
            {(["portrait", "landscape"] as PaperOrientation[]).map((o) => (
              <button
                key={o}
                className={`btn${paper.orientation === o ? " btn-active" : ""}`}
                onClick={() =>
                  store.setPrintSettings({
                    paper: { ...paper, orientation: o },
                  })
                }
                style={{
                  flex: 1,
                  justifyContent: "center",
                  borderRadius: 6,
                  padding: 6,
                  fontSize: 11.5,
                }}
              >
                {t(`orientation.${o}`)}
              </button>
            ))}
          </div>
        </Section>

        <Section title={t("sections.calibration")}>
          <div
            className="mono"
            style={{ fontSize: 11, color: "var(--text-secondary)" }}
          >
            {t("calibration.correctionFactor")}{" "}
            <span style={{ color: "var(--accent)" }}>
              {calibration.correctionFactor.toFixed(4)}
            </span>
          </div>
          {!calibrating ? (
            <button
              className="btn"
              onClick={() => setCalibrating(true)}
              style={{
                justifyContent: "center",
                borderRadius: 6,
                padding: 8,
                fontSize: 12,
              }}
            >
              {t("calibration.testButton")}
            </button>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                background: "var(--bg-app)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                padding: 10,
              }}
            >
              <span style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>
                {t("calibration.instructions", {
                  length: CALIBRATION_LENGTH_CM,
                })}
              </span>
              <button
                className="btn"
                onClick={() => window.print()}
                style={{
                  justifyContent: "center",
                  borderRadius: 6,
                  padding: 7,
                  fontSize: 12,
                }}
              >
                {t("calibration.printReference")}
              </button>
              <label
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: 12,
                  color: "var(--text-secondary)",
                }}
              >
                {t("calibration.measuredLabel")}
                <input
                  type="number"
                  className="mono"
                  step={0.01}
                  value={measuredCm}
                  onChange={(e) => setMeasuredCm(Number(e.target.value))}
                  style={{
                    width: 70,
                    background: "var(--bg-panel-2)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    color: "var(--text-primary)",
                    padding: "4px 6px",
                  }}
                />
              </label>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  className="btn"
                  onClick={applyCalibration}
                  style={{
                    flex: 1,
                    justifyContent: "center",
                    borderRadius: 6,
                    padding: 7,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {t("calibration.apply")}
                </button>
                <button
                  className="btn"
                  onClick={() => setCalibrating(false)}
                  style={{
                    flex: 1,
                    justifyContent: "center",
                    borderRadius: 6,
                    padding: 7,
                    fontSize: 12,
                  }}
                >
                  {t("calibration.cancel")}
                </button>
              </div>
            </div>
          )}
        </Section>

        <Section title={t("sections.tiling")}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
              color: "var(--text-secondary)",
            }}
          >
            <input
              type="checkbox"
              checked={tiling.enabled}
              onChange={(e) =>
                store.setPrintSettings({
                  tiling: { ...tiling, enabled: e.target.checked },
                })
              }
            />
            {t("tiling.enableLabel")}
          </label>
          {tiling.enabled && (
            <>
              <label
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: 12,
                  color: "var(--text-secondary)",
                }}
              >
                {t("tiling.overlapLabel")}
                <input
                  type="number"
                  className="mono"
                  min={0}
                  step={0.5}
                  value={tiling.overlapCm}
                  onChange={(e) =>
                    store.setPrintSettings({
                      tiling: { ...tiling, overlapCm: Number(e.target.value) },
                    })
                  }
                  style={{
                    width: 70,
                    background: "var(--bg-panel-2)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    color: "var(--text-primary)",
                    padding: "4px 6px",
                  }}
                />
              </label>
              {(
                [
                  "trimMarks",
                  "alignmentMarks",
                  "pageNumbers",
                  "pageCoordinates",
                ] as const
              ).map((key) => (
                <label
                  key={key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 12,
                    color: "var(--text-secondary)",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={tiling[key]}
                    onChange={(e) =>
                      store.setPrintSettings({
                        tiling: { ...tiling, [key]: e.target.checked },
                      })
                    }
                  />
                  {key === "trimMarks"
                    ? t("tiling.trimMarks")
                    : key === "alignmentMarks"
                      ? t("tiling.alignmentMarks")
                      : key === "pageNumbers"
                        ? t("tiling.pageNumbers")
                        : t("tiling.pageCoordinates")}
                </label>
              ))}
              {grid && (
                <div
                  className="mono"
                  style={{ fontSize: 11, color: "var(--accent)" }}
                >
                  {t("tiling.pagesCount", {
                    count: grid.cols * grid.rows,
                    cols: grid.cols,
                    rows: grid.rows,
                  })}
                </div>
              )}
            </>
          )}
        </Section>

        <button
          className="btn"
          onClick={() => window.print()}
          style={{
            justifyContent: "center",
            borderRadius: "var(--radius-sm)",
            padding: 10,
            fontSize: 13,
            fontWeight: 700,
            background: "var(--accent)",
            color: "white",
            borderColor: "transparent",
          }}
        >
          {t("printButton")}
        </button>
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "auto",
          padding: 24,
        }}
      >
        {renderPages({
          calibrating,
          grid,
          tiling,
          state,
          path,
          box,
          paperSize,
          effectiveScale,
        })}
      </div>

      {/* The screen preview above lives inside this panel's own flex/absolute layout,
          which is exactly wrong for print: pagination needs plain top-to-bottom flow at
          true page size. Rather than fight that layout with print-only overrides, the
          same pages are rendered a second time into a portal mounted directly on
          <body>, with the rest of the app hidden outright for print — see theme.css. */}
      <PrintPortal>
        {renderPages({
          calibrating,
          grid,
          tiling,
          state,
          path,
          box,
          paperSize,
          effectiveScale,
        })}
      </PrintPortal>
    </div>
  );
}

function renderPages({
  calibrating,
  grid,
  tiling,
  state,
  path,
  box,
  paperSize,
  effectiveScale,
}: {
  calibrating: boolean;
  grid: ReturnType<typeof computeTileGrid> | null;
  tiling: EditorState["printSettings"]["tiling"];
  state: EditorState;
  path: ReturnType<typeof boardPath>;
  box: BoundingBox;
  paperSize: { width: number; height: number };
  effectiveScale: number;
}) {
  if (calibrating) {
    return (
      <div className="print-page">
        <CalibrationPage paperSize={paperSize} />
      </div>
    );
  }
  if (grid) {
    return (
      <div
        className="print-tile-grid"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${grid.cols}, auto)`,
          gap: 16,
        }}
      >
        {grid.tiles.map((tile) => (
          <PrintPage
            key={`${tile.col}-${tile.row}`}
            state={state}
            path={path}
            box={box}
            paperSize={paperSize}
            effectiveScale={effectiveScale}
            tileOffsetCm={{ x: tile.x, y: tile.y }}
            tileLabel={
              tiling.pageNumbers
                ? `${tile.row * grid.cols + tile.col + 1}`
                : undefined
            }
            coordLabel={
              tiling.pageCoordinates
                ? `${String.fromCharCode(65 + tile.row)}${tile.col + 1}`
                : undefined
            }
            trimMarks={tiling.trimMarks}
            alignmentMarks={tiling.alignmentMarks}
          />
        ))}
      </div>
    );
  }
  return (
    <PrintPage
      state={state}
      path={path}
      box={box}
      paperSize={paperSize}
      effectiveScale={effectiveScale}
    />
  );
}

// Mounts its children on a dedicated <div id="print-portal"> appended directly to
// <body> — sidesteps this panel's own flex/absolute layout entirely, which is what a
// print stylesheet needs: plain elements in normal page flow for @page pagination.
function PrintPortal({ children }: { children: React.ReactNode }) {
  const [container] = useState(() => {
    const el = document.createElement("div");
    el.id = "print-portal";
    return el;
  });

  useEffect(() => {
    document.body.appendChild(container);
    return () => {
      document.body.removeChild(container);
    };
  }, [container]);

  return createPortal(children, container);
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

function CalibrationPage({
  paperSize,
}: {
  paperSize: { width: number; height: number };
}) {
  const { t } = useTranslation("printPreview");
  const paperPx = {
    width: paperSize.width * PRINT_PX_PER_CM,
    height: paperSize.height * PRINT_PX_PER_CM,
  };
  const lineY = paperPx.height / 2;
  const lineStartX =
    (paperPx.width - CALIBRATION_LENGTH_CM * PRINT_PX_PER_CM) / 2;
  const lineEndX = lineStartX + CALIBRATION_LENGTH_CM * PRINT_PX_PER_CM;
  return (
    <svg
      width={paperPx.width}
      height={paperPx.height}
      style={{ background: "white" }}
    >
      <line
        x1={lineStartX}
        y1={lineY}
        x2={lineEndX}
        y2={lineY}
        stroke="black"
        strokeWidth={1.5}
      />
      <line
        x1={lineStartX}
        y1={lineY - 8}
        x2={lineStartX}
        y2={lineY + 8}
        stroke="black"
        strokeWidth={1.5}
      />
      <line
        x1={lineEndX}
        y1={lineY - 8}
        x2={lineEndX}
        y2={lineY + 8}
        stroke="black"
        strokeWidth={1.5}
      />
      <text
        x={(lineStartX + lineEndX) / 2}
        y={lineY - 16}
        textAnchor="middle"
        fontSize={14}
        fill="black"
      >
        {t("calibration.lineLabel", { length: CALIBRATION_LENGTH_CM })}
      </text>
    </svg>
  );
}

// docs/specs/14-printing.md — a fixed diagonal offset put numbers for pins on the
// far side of a closed shape (bottom/left of a circle, say) back over the shape's
// interior, covering other pins and paths (see printed-template feedback). A pure
// radial-from-centre offset fixed that for round/star-like shapes, but for anything
// with straight runs of collinear pins (Line, Rectangle/Square edges, and Freehand
// wherever the sampled path is locally straight or curls tight, e.g. a spiral) the
// centre-to-pin ray points ALONG the path rather than away from it — the label lands
// on the next pin instead of beside its own. The general fix is the local outward
// NORMAL: perpendicular to the path's tangent at that pin (from its neighbours in
// the already-ordered `pins` array), oriented away from the shape's centre. This
// reduces to the same radial offset for circles/ellipses/polygons (tangent there is
// always perpendicular to the radius already) and additionally fixes the collinear
// cases the pure-radial version got wrong.
function pinLabelPosition(
  pin: Point,
  prev: Point | null,
  next: Point | null,
  center: Point,
  offsetCm: number,
): Point {
  const tx = (next?.x ?? pin.x) - (prev?.x ?? pin.x);
  const ty = (next?.y ?? pin.y) - (prev?.y ?? pin.y);
  const tlen = Math.hypot(tx, ty);
  let nx: number, ny: number;
  if (tlen > 1e-6) {
    nx = -ty / tlen;
    ny = tx / tlen;
    const toPinX = pin.x - center.x;
    const toPinY = pin.y - center.y;
    if (nx * toPinX + ny * toPinY < 0) {
      nx = -nx;
      ny = -ny;
    }
  } else {
    const dx = pin.x - center.x;
    const dy = pin.y - center.y;
    const dist = Math.hypot(dx, dy);
    [nx, ny] = dist > 1e-6 ? [dx / dist, dy / dist] : [0, -1];
  }
  return { x: pin.x + nx * offsetCm, y: pin.y + ny * offsetCm };
}

// Precomputes every pin's label position for one pin path in one pass, matching
// pins up with their path-order neighbours (wrapping around for a closed shape,
// clamping at the ends for an open one like Line/Arc/Freehand).
function pinLabelPositions(pins: Point[], closed: boolean, center: Point, offsetCm: number): Point[] {
  const n = pins.length;
  return pins.map((pin, i) => {
    const prev = closed ? pins[(i - 1 + n) % n] : (pins[i - 1] ?? null);
    const next = closed ? pins[(i + 1) % n] : (pins[i + 1] ?? null);
    return pinLabelPosition(pin, prev, next, center, offsetCm);
  });
}

// The mirrored pin center is the source shape's centre carried through the same
// mirror/radial transform used to derive the mirrored pins themselves, so its
// label ray stays consistent with computeMirroredPinGroups' own point order.
function mirroredGeometryCenters(pinPath: PinPath): Point[] {
  const symmetry = pinPath.symmetry;
  if (symmetry.type === "none") return [];
  const center = geometryCenter(pinPath.geometry);
  const groups =
    symmetry.type === "radial"
      ? generateRadialCopies(
          [center],
          symmetry.centre,
          symmetry.intervalDegrees,
        )
      : mirrorCopies([center], symmetry.type, symmetry.axis);
  return groups.map((group) => group[0]);
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
  // Board geometry (outline/guides/threads) prints true-to-scale, but a pin dot/number
  // shrunk proportionally with a "fit to page" board becomes sub-pixel and vanishes —
  // so their on-paper size is floored to stay legible regardless of effectiveScale.
  const groupScale = effectiveScale * PRINT_PX_PER_CM;
  const pinDotRadiusCm = (diameterMm: number) =>
    Math.max(diameterMm / 20, MIN_PIN_DOT_RADIUS_PX / groupScale);
  const pinNumberFontCm = MIN_PIN_NUMBER_FONT_PX / groupScale;
  const pinNumberGapCm = PIN_NUMBER_GAP_PX / groupScale;
  // Centered (text-anchor/dominant-baseline "middle") on the offset point, so the
  // label's near edge — not its center — needs to clear the dot: push out by the
  // dot radius plus half the glyph height plus a small gap, not just the gap alone.
  const pinNumberOffsetCm = (diameterMm: number) =>
    pinDotRadiusCm(diameterMm) + pinNumberFontCm / 2 + pinNumberGapCm;
  const gridStrokeWidthCm = Math.max(0.02, MIN_GRID_STROKE_PX / groupScale);
  const paperPx = {
    width: paperSize.width * PRINT_PX_PER_CM,
    height: paperSize.height * PRINT_PX_PER_CM,
  };
  const boardCenter = {
    x: (box.minX + box.maxX) / 2,
    y: (box.minY + box.maxY) / 2,
  };
  // Content origin: board centre maps to paper centre, then the tile's offset shifts
  // that origin so each page shows a different slice of the printed-size content.
  const originPx = {
    x: (paperSize.width / 2 - (tileOffsetCm?.x ?? 0)) * PRINT_PX_PER_CM,
    y: (paperSize.height / 2 - (tileOffsetCm?.y ?? 0)) * PRINT_PX_PER_CM,
  };
  // The on-screen preview and the print portal both render a PrintPage for the same
  // tile at the same time (see <PrintPortal> below) — a plain tileLabel/coordLabel id
  // would collide between those two instances, making `url(#id)` clip-path references
  // ambiguous. useId() keeps every instance's ids unique regardless of duplication.
  const instanceId = useId();
  const clipId = `tile-clip-${instanceId}-${tileLabel ?? "single"}-${coordLabel ?? ""}`;

  return (
    <div className="print-page" style={{ position: "relative" }}>
      <svg
        width={paperPx.width}
        height={paperPx.height}
        style={{ background: "white" }}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={0} y={0} width={paperPx.width} height={paperPx.height} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clipId})`}>
          <g
            transform={`translate(${originPx.x}, ${originPx.y}) scale(${effectiveScale * PRINT_PX_PER_CM}) translate(${-boardCenter.x}, ${-boardCenter.y})`}
          >
            <defs>
              {elements.background && (
                <BoardFillDefs
                  id={`print-fill-${clipId}`}
                  appearance={state.board.appearance}
                />
              )}
            </defs>
            {elements.grid && (
              <g opacity={GRID_OPACITY}>
                {Array.from({ length: 200 }, (_, i) => i - 100).map((i) => (
                  <line
                    key={`v${i}`}
                    x1={i}
                    y1={-500}
                    x2={i}
                    y2={500}
                    stroke="black"
                    strokeWidth={gridStrokeWidthCm}
                  />
                ))}
                {Array.from({ length: 200 }, (_, i) => i - 100).map((i) => (
                  <line
                    key={`h${i}`}
                    x1={-500}
                    y1={i}
                    x2={500}
                    y2={i}
                    stroke="black"
                    strokeWidth={gridStrokeWidthCm}
                  />
                ))}
              </g>
            )}
            {elements.boardOutline && (
              <path
                d={pathToSvgD(path)}
                fill={
                  elements.background
                    ? boardFillPaint(
                        `print-fill-${clipId}`,
                        state.board.appearance,
                      )
                    : "none"
                }
                stroke="black"
                strokeWidth={0.05}
              />
            )}
            {elements.threads &&
              state.threadLayers.flatMap((l) =>
                l.threadPaths.map((t) => {
                  const points = t.pinIds
                    .map((id) => findPinById(state.pinLayers, id))
                    .filter((p): p is NonNullable<typeof p> => !!p);
                  if (points.length < 2) return null;
                  const d = points
                    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
                    .join(" ");
                  return (
                    <path
                      key={t.id}
                      d={d}
                      fill="none"
                      stroke={t.colours[0]}
                      strokeWidth={0.03}
                    />
                  );
                }),
              )}
            {state.pinLayers.flatMap((l) =>
              l.pinPaths.map((p) => {
                const center = geometryCenter(p.geometry);
                // A Text Pin Path is N independent closed contours (every glyph
                // outline is a closed loop) — treat it as closed for label placement,
                // the same as Circle/Ellipse.
                const closed = p.geometry.type === "text" ? true : geometryToContourPaths(p.geometry)[0].closed;
                const mirroredCenters = mirroredGeometryCenters(p);
                const offsetCm = pinNumberOffsetCm(p.diameter);
                const labelPositions = pinLabelPositions(p.pins, closed, center, offsetCm);
                return (
                  <g key={p.id}>
                    {elements.pinGuides && (
                      <path
                        d={geometryToContourPaths(p.geometry).map(pathToSvgD).join(" ")}
                        fill="none"
                        stroke="black"
                        strokeOpacity={0.8}
                        strokeWidth={0.03}
                        strokeDasharray="0.15 0.1"
                      />
                    )}
                    {elements.pins &&
                      p.pins.map((pin, i) => {
                        const labelPos = labelPositions[i];
                        return (
                          <g key={pin.id}>
                            <circle
                              cx={pin.x}
                              cy={pin.y}
                              r={pinDotRadiusCm(p.diameter)}
                              fill="black"
                            />
                            {elements.pinNumbers && (
                              <text
                                x={labelPos.x}
                                y={labelPos.y}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fontSize={pinNumberFontCm}
                                fill="black"
                              >
                                {i + 1}
                              </text>
                            )}
                          </g>
                        );
                      })}
                    {/* docs/specs/06-symmetry.md — a mirrored pin is a real physical pin
                      on the board, so it prints too, numbered after its source. */}
                    {elements.pins &&
                      computeMirroredPinGroups(p).flatMap(
                        (group, groupIndex) => {
                          const mirroredCenter = mirroredCenters[groupIndex];
                          const mirroredLabelPositions = pinLabelPositions(group, closed, mirroredCenter, offsetCm);
                          return group.map((pin, i) => {
                            const labelPos = mirroredLabelPositions[i];
                            return (
                              <g key={pin.id}>
                                <circle
                                  cx={pin.x}
                                  cy={pin.y}
                                  r={pinDotRadiusCm(p.diameter)}
                                  fill="black"
                                />
                                {elements.pinNumbers && (
                                  <text
                                    x={labelPos.x}
                                    y={labelPos.y}
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    fontSize={pinNumberFontCm}
                                    fill="black"
                                  >
                                    {i + 1}
                                  </text>
                                )}
                              </g>
                            );
                          });
                        },
                      )}
                  </g>
                );
              }),
            )}
          </g>
        </g>

        {trimMarks && (
          <g stroke="black" strokeWidth={1} opacity={0.6}>
            <line x1={0} y1={12} x2={12} y2={12} />
            <line x1={12} y1={0} x2={12} y2={12} />
            <line x1={paperPx.width - 12} y1={12} x2={paperPx.width} y2={12} />
            <line
              x1={paperPx.width - 12}
              y1={0}
              x2={paperPx.width - 12}
              y2={12}
            />
            <line
              x1={0}
              y1={paperPx.height - 12}
              x2={12}
              y2={paperPx.height - 12}
            />
            <line
              x1={12}
              y1={paperPx.height - 12}
              x2={12}
              y2={paperPx.height}
            />
            <line
              x1={paperPx.width - 12}
              y1={paperPx.height - 12}
              x2={paperPx.width}
              y2={paperPx.height - 12}
            />
            <line
              x1={paperPx.width - 12}
              y1={paperPx.height - 12}
              x2={paperPx.width - 12}
              y2={paperPx.height}
            />
          </g>
        )}
        {alignmentMarks && (
          <g stroke="black" strokeWidth={1} opacity={0.5}>
            <line
              x1={paperPx.width / 2 - 6}
              y1={paperPx.height / 2}
              x2={paperPx.width / 2 + 6}
              y2={paperPx.height / 2}
            />
            <line
              x1={paperPx.width / 2}
              y1={paperPx.height / 2 - 6}
              x2={paperPx.width / 2}
              y2={paperPx.height / 2 + 6}
            />
          </g>
        )}
        {(tileLabel || coordLabel) && (
          <text
            x={paperPx.width - 8}
            y={paperPx.height - 8}
            textAnchor="end"
            fontSize={11}
            fill="black"
            opacity={0.7}
          >
            {[coordLabel, tileLabel].filter(Boolean).join(" · ")}
          </text>
        )}
      </svg>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.06em",
          color: "var(--text-tertiary)",
          textTransform: "uppercase",
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}
