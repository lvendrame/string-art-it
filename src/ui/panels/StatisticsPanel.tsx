import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { pinPathStatistics, projectTotalPins, threadPathStatistics, threadStatisticsByType, type EditorStore } from "../../application/document";
import { useEditorState } from "../useEditorStore";

// docs/specs/17-statistics.md
export function StatisticsPanel({ store, onClose }: { store: EditorStore; onClose: () => void }) {
  const { t } = useTranslation(["panels", "common"]);
  const state = useEditorState(store);
  const typeStats = threadStatisticsByType(state.threadLayers, state.pinLayers);

  return (
    <div style={{ position: "absolute", inset: 0, background: "var(--bg-app)", zIndex: 10, overflowY: "auto", padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <span style={{ fontWeight: 700, fontSize: 15 }}>{t("statisticsPanel.title", { ns: "panels" })}</span>
        <button className="btn" onClick={onClose} style={{ borderRadius: 6, padding: "4px 10px", fontSize: 12 }}>{t("actions.close", { ns: "common" })}</button>
      </div>

      <div style={{ maxWidth: 1000, display: "flex", flexDirection: "column", gap: 16 }}>
        <CollapsibleSection title={t("statisticsPanel.summaryTitle", { ns: "panels" })}>
          <div style={{ background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: 16 }}>
            <div className="mono" style={{ fontSize: 24, fontWeight: 700, color: "var(--accent)" }}>{projectTotalPins(state.pinLayers)}</div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{t("statisticsPanel.totalPins", { ns: "panels" })}</div>
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
    </div>
  );
}

function CollapsibleSection({ title, children, defaultOpen = true }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details open={defaultOpen} style={{ background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: 16 }}>
      <summary style={{ fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{title}</summary>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16, marginTop: 16 }}>
        {children}
      </div>
    </details>
  );
}

function ColourSwatch({ colour }: { colour: string }) {
  return (
    <span
      style={{ display: "inline-block", width: 14, height: 10, borderRadius: 2, border: "1px solid var(--border)", background: colour, verticalAlign: "middle" }}
    />
  );
}

function ColoursValue({ colours }: { colours: string[] }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      {colours.map((colour, i) => (
        <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <ColourSwatch colour={colour} />
          {colour}
        </span>
      ))}
    </span>
  );
}

function StatCard({ title, rows }: { title: ReactNode; rows: [string, ReactNode][] }) {
  return (
    <div style={{ background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>{title}</div>
      {rows.map(([label, value]) => (
        <div key={label} className="mono" style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
          <span style={{ color: "var(--text-secondary)" }}>{label}</span>
          <span style={{ color: "var(--text-primary)" }}>{value}</span>
        </div>
      ))}
    </div>
  );
}
