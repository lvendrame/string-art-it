import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { pinPathStatistics, projectTotalPins, threadPathStatistics, threadStatisticsByType, type EditorStore } from "../../application/document";
import { useEditorState } from "../useEditorStore";
import { OverlayPanel, OverlayPanelHeader } from "./OverlayPanel";
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

function CollapsibleSection({ title, children, defaultOpen = true }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details open={defaultOpen} className="statistics-panel__section">
      <summary className="statistics-panel__section-summary">{title}</summary>
      <div className="statistics-panel__section-grid">{children}</div>
    </details>
  );
}

function ColourSwatch({ colour }: { colour: string }) {
  return <span className="statistics-panel__swatch" style={{ background: colour }} />;
}

function ColoursValue({ colours }: { colours: string[] }) {
  return (
    <span className="statistics-panel__colours">
      {colours.map((colour, i) => (
        <span key={i} className="statistics-panel__colour-item">
          <ColourSwatch colour={colour} />
          {colour}
        </span>
      ))}
    </span>
  );
}

function StatCard({ title, rows }: { title: ReactNode; rows: [string, ReactNode][] }) {
  return (
    <div className="statistics-panel__card">
      <div className="statistics-panel__card-title">{title}</div>
      {rows.map(([label, value]) => (
        <div key={label} className="mono statistics-panel__card-row">
          <span className="statistics-panel__card-row-label">{label}</span>
          <span className="statistics-panel__card-row-value">{value}</span>
        </div>
      ))}
    </div>
  );
}
