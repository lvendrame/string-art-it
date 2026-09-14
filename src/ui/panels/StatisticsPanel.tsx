import { useTranslation } from "react-i18next";
import { pinPathStatistics, projectTotalPins, threadPathStatistics, type EditorStore } from "../../application/document";
import { useEditorState } from "../useEditorStore";

// docs/specs/17-statistics.md
export function StatisticsPanel({ store, onClose }: { store: EditorStore; onClose: () => void }) {
  const { t } = useTranslation(["panels", "common"]);
  const state = useEditorState(store);

  return (
    <div style={{ position: "absolute", inset: 0, background: "var(--bg-app)", zIndex: 10, overflowY: "auto", padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <span style={{ fontWeight: 700, fontSize: 15 }}>{t("statisticsPanel.title", { ns: "panels" })}</span>
        <button className="btn" onClick={onClose} style={{ borderRadius: 6, padding: "4px 10px", fontSize: 12 }}>{t("actions.close", { ns: "common" })}</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16, maxWidth: 1000 }}>
        <div style={{ background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: 16 }}>
          <div className="mono" style={{ fontSize: 24, fontWeight: 700, color: "var(--accent)" }}>{projectTotalPins(state.pinLayers)}</div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{t("statisticsPanel.totalPins", { ns: "panels" })}</div>
        </div>

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
                  [t("statisticsPanel.colours", { ns: "panels" }), stats.colours.join(" / ")],
                ]}
              />
            );
          }),
        )}
      </div>
    </div>
  );
}

function StatCard({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div style={{ background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 12.5, fontWeight: 700 }}>{title}</div>
      {rows.map(([label, value]) => (
        <div key={label} className="mono" style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
          <span style={{ color: "var(--text-secondary)" }}>{label}</span>
          <span style={{ color: "var(--text-primary)" }}>{value}</span>
        </div>
      ))}
    </div>
  );
}
