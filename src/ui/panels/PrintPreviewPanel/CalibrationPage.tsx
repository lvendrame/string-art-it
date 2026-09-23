import { useTranslation } from "react-i18next";
import { CALIBRATION_LENGTH_CM, PRINT_PX_PER_CM } from "./constants";

export function CalibrationPage({
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
    <svg width={paperPx.width} height={paperPx.height} className="print-preview-panel__page-svg">
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
