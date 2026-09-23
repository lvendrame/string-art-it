import { useTranslation } from "react-i18next";
import { pinPathStatistics, projectTotalPins, threadPathStatistics, threadStatisticsByType, type EditorStore } from "@application/document";
import { useEditorState } from "@ui/useEditorStore";
import { OverlayPanel } from "@ui/panels/OverlayPanel/OverlayPanel";
import { OverlayPanelHeader } from "@ui/panels/OverlayPanel/OverlayPanelHeader";
import { CollapsibleSection } from "./CollapsibleSection";
import { ColoursValue } from "./ColoursValue";
import { StatCard } from "./StatCard";
import "./StatisticsPanel.css";

// docs/specs/17-statistics.md
export function StatisticsPanel({ store, onClose }: { store: EditorStore; onClose: () => void }) {
  const { t } = useTranslation(["panels", "common"]);
  const state = useEditorState(store);
  const typeStats = threadStatisticsByType(state.threadLayers, state.pinLayers);

  return (
    <OverlayPanel className="statistics-panel">
      <OverlayPanelHeader title={t("statisticsPanel.title", { ns: "panels" })} onClose={onClose} />

      <div className="statistics-panel__content">
        <CollapsibleSection title={t("statisticsPanel.summaryTitle", { ns: "panels" })}>
          <div className="statistics-panel__summary-card">
            <div className="mono statistics-panel__summary-value">{projectTotalPins(state.pinLayers)}</div>
            <div className="statistics-panel__summary-label">{t("statisticsPanel.totalPins", { ns: "panels" })}</div>
          </div>

          {typeStats.map((stat) => (
            <StatCard
              key={`${stat.colours.join(",")}@${stat.width}`}
              title={<ColoursValue colours={stat.colours} />}
              rows={[
                [t("statisticsPanel.width", { ns: "panels" }), String(stat.width)],
                [t("statisticsPanel.threadCount", { ns: "panels" }), String(stat.threadCount)],
                [t("statisticsPanel.segments", { ns: "panels" }), String(stat.totalSegments)],
                [t("statisticsPanel.threadLength", { ns: "panels" }), `${(stat.totalLengthCm / 100).toFixed(2)} m`],
                [t("statisticsPanel.pinsVisited", { ns: "panels" }), String(stat.totalPinsVisited)],
              ]}
            />
          ))}
        </CollapsibleSection>

        <CollapsibleSection title={t("statisticsPanel.detailsTitle", { ns: "panels" })} defaultOpen={false}>
          {state.pinLayers.flatMap((layer) =>
            layer.pinPaths.map((path, i) => {
              const stats = pinPathStatistics(path);
              return (
                <StatCard
                  key={path.id}
                  title={t("statisticsPanel.pathTitle", { ns: "panels", layerName: layer.name, index: i + 1 })}
                  rows={[
                    [t("statisticsPanel.pins", { ns: "panels" }), String(stats.pins)],
                    [t("statisticsPanel.requestedGap", { ns: "panels" }), `${stats.requestedSpacing.toFixed(2)} cm`],
                    [t("statisticsPanel.actualGap", { ns: "panels" }), `${stats.actualSpacing.toFixed(2)} cm`],
                    [t("statisticsPanel.pinDiameter", { ns: "panels" }), `${stats.diameter} mm`],
                  ]}
                />
              );
            }),
          )}

          {state.threadLayers.flatMap((layer) =>
            layer.threadPaths.map((thread, i) => {
              const stats = threadPathStatistics(thread, state.pinLayers);
              return (
                <StatCard
                  key={thread.id}
                  title={t("statisticsPanel.threadTitle", { ns: "panels", layerName: layer.name, index: i + 1 })}
                  rows={[
                    [t("statisticsPanel.segments", { ns: "panels" }), String(stats.segments)],
                    [t("statisticsPanel.threadLength", { ns: "panels" }), `${(stats.lengthCm / 100).toFixed(2)} m`],
                    [t("statisticsPanel.pinsVisited", { ns: "panels" }), String(stats.pinsVisited)],
                    [t("statisticsPanel.colours", { ns: "panels" }), <ColoursValue colours={stats.colours} />],
                  ]}
                />
              );
            }),
          )}
        </CollapsibleSection>
      </div>
    </OverlayPanel>
  );
}
