import { useTranslation } from "react-i18next";
import "./PinPathStatsBox.css";

// docs/specs/17-statistics.md — same Pins/Actual-gap/Perimeter figures the Statistics
// overlay's per-path card shows, surfaced inline whenever one or more Pin Paths are
// selected in Edit mode. `actualGapCm` is omitted for a multi-path selection (2+ paths
// can have different actual spacing, so no single "Actual gap" value is unambiguous —
// Pins and Perimeter still sum cleanly across the whole selection).
export function PinPathStatsBox({ pins, actualGapCm, perimeterCm }: { pins: number; actualGapCm?: number; perimeterCm: number }) {
  const { t } = useTranslation("panels");
  const rows: [string, string][] = [
    [t("selectionPanel.stats.pins"), String(pins)],
    ...(actualGapCm !== undefined ? ([[t("selectionPanel.stats.actualGap"), `${actualGapCm.toFixed(2)} cm`]] as [string, string][]) : []),
    [t("selectionPanel.stats.perimeter"), `${perimeterCm.toFixed(2)} cm`],
  ];

  return (
    <div className="selection-panel__stats-box">
      <div className="selection-panel__section-title">{t("selectionPanel.stats.title")}</div>
      {rows.map(([label, value]) => (
        <div key={label} className="mono selection-panel__stats-row">
          <span className="selection-panel__stats-label">{label}</span>
          <span className="selection-panel__stats-value">{value}</span>
        </div>
      ))}
    </div>
  );
}
