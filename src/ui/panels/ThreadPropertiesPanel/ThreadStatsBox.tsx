import { useTranslation } from "react-i18next";
import { threadPathStatistics, type EditorStore } from "@application/document";
import "./ThreadStatsBox.css";

// docs/specs/17-statistics.md — same figures as the Statistics overlay's per-thread
// StatCard, surfaced inline so selecting a thread shows its stats without leaving
// Thread mode. Always derived live from the current document, never stored.
export function ThreadStatsBox({ thread, pinLayers }: { thread: NonNullable<ReturnType<EditorStore["getSelectedThreadPath"]>>; pinLayers: Parameters<typeof threadPathStatistics>[1] }) {
  const { t } = useTranslation("panels");
  const stats = threadPathStatistics(thread, pinLayers);
  const rows: [string, string][] = [
    [t("threadPropertiesPanel.stats.segments"), String(stats.segments)],
    [t("threadPropertiesPanel.stats.threadLength"), `${(stats.lengthCm / 100).toFixed(2)} m`],
    [t("threadPropertiesPanel.stats.pinsVisited"), String(stats.pinsVisited)],
  ];

  return (
    <div className="thread-properties-panel__box">
      <div className="thread-properties-panel__section-title">{t("threadPropertiesPanel.stats.title")}</div>
      {rows.map(([label, value]) => (
        <div key={label} className="mono thread-properties-panel__stats-row">
          <span className="thread-properties-panel__stats-label">{label}</span>
          <span className="thread-properties-panel__stats-value">{value}</span>
        </div>
      ))}
    </div>
  );
}
