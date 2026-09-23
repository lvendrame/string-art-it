import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import {
  boardPath,
  computeCorrectionFactor,
  computeEffectiveScale,
  computeTileGrid,
  paperDimensionsCm,
  type EditorState,
  type EditorStore,
  type PaperOrientation,
  type PaperSize,
  type PrintElements,
  type PrintScaleMode,
} from "../../../application/document";
import { pathBoundingBoxPoints } from "../../../domain/paths";
import { boundingBoxOf, type BoundingBox } from "../../../domain/transforms";
import { Button } from "../../Button";
import { useEditorState } from "../../useEditorStore";
import { OverlayPanel } from "../OverlayPanel/OverlayPanel";
import { CALIBRATION_LENGTH_CM } from "./constants";
import { PrintPortal } from "./PrintPortal";
import { CalibrationPage } from "./CalibrationPage";
import { PrintPage } from "./PrintPage";
import { Section } from "./Section";
import "./PrintPreviewPanel.css";

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
    <OverlayPanel className="print-preview-panel">
      <div className="print-preview-panel__sidebar">
        <div className="print-preview-panel__header">
          <span className="print-preview-panel__title">{t("panelTitle")}</span>
          <Button
            variant="toggle"
            size="icon-sm"
            onClick={onClose}
            aria-label={t("actions.close", { ns: "common" })}
          >
            <X size={14} />
          </Button>
        </div>

        <Section title={t("sections.printElements")}>
          {labels.map(({ key, label }) => (
            <label key={key} className="print-preview-panel__checkbox-row">
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
            <label key={mode} className="print-preview-panel__checkbox-row">
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
              className="mono print-preview-panel__number-input print-preview-panel__number-input--wide"
              step={0.05}
              value={scale.customRatio}
              onChange={(e) =>
                store.setPrintSettings({
                  scale: { ...scale, customRatio: Number(e.target.value) },
                })
              }
            />
          )}
          <div className="mono print-preview-panel__accent-readout">
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
            className="print-preview-panel__select"
          >
            <option value="A4">{t("paperSizes.A4")}</option>
            <option value="A3">{t("paperSizes.A3")}</option>
            <option value="Letter">{t("paperSizes.Letter")}</option>
            <option value="custom">{t("paperSizes.custom")}</option>
          </select>
          <div className="print-preview-panel__orientation-row">
            {(["portrait", "landscape"] as PaperOrientation[]).map((o) => (
              <button
                key={o}
                className={`btn print-preview-panel__orientation-btn${paper.orientation === o ? " btn-active" : ""}`}
                onClick={() =>
                  store.setPrintSettings({
                    paper: { ...paper, orientation: o },
                  })
                }
              >
                {t(`orientation.${o}`)}
              </button>
            ))}
          </div>
        </Section>

        <Section title={t("sections.calibration")}>
          <div className="mono print-preview-panel__calibration-readout">
            {t("calibration.correctionFactor")}{" "}
            <span className="print-preview-panel__accent-text">
              {calibration.correctionFactor.toFixed(4)}
            </span>
          </div>
          {!calibrating ? (
            <button
              className="btn print-preview-panel__calibration-test-btn"
              onClick={() => setCalibrating(true)}
            >
              {t("calibration.testButton")}
            </button>
          ) : (
            <div className="print-preview-panel__calibration-box">
              <span className="print-preview-panel__calibration-instructions">
                {t("calibration.instructions", {
                  length: CALIBRATION_LENGTH_CM,
                })}
              </span>
              <button className="btn print-preview-panel__calibration-print-btn" onClick={() => window.print()}>
                {t("calibration.printReference")}
              </button>
              <label className="print-preview-panel__row-between">
                {t("calibration.measuredLabel")}
                <input
                  type="number"
                  className="mono print-preview-panel__number-input"
                  step={0.01}
                  value={measuredCm}
                  onChange={(e) => setMeasuredCm(Number(e.target.value))}
                />
              </label>
              <div className="print-preview-panel__calibration-row">
                <button className="btn print-preview-panel__calibration-apply-btn" onClick={applyCalibration}>
                  {t("calibration.apply")}
                </button>
                <button className="btn print-preview-panel__calibration-cancel-btn" onClick={() => setCalibrating(false)}>
                  {t("calibration.cancel")}
                </button>
              </div>
            </div>
          )}
        </Section>

        <Section title={t("sections.tiling")}>
          <label className="print-preview-panel__checkbox-row">
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
              <label className="print-preview-panel__row-between">
                {t("tiling.overlapLabel")}
                <input
                  type="number"
                  className="mono print-preview-panel__number-input"
                  min={0}
                  step={0.5}
                  value={tiling.overlapCm}
                  onChange={(e) =>
                    store.setPrintSettings({
                      tiling: { ...tiling, overlapCm: Number(e.target.value) },
                    })
                  }
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
                <label key={key} className="print-preview-panel__checkbox-row">
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
                <div className="mono print-preview-panel__accent-readout">
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

        <button className="btn print-preview-panel__print-btn" onClick={() => window.print()}>
          {t("printButton")}
        </button>
      </div>

      <div className="print-preview-panel__preview">
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
    </OverlayPanel>
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
      <div className="print-tile-grid" style={{ gridTemplateColumns: `repeat(${grid.cols}, auto)` }}>
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

