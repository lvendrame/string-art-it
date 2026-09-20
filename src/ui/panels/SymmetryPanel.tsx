import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { symmetryConfigForType, type EditorStore, type SymmetryConfig } from "../../application/document";
import { useEditorState } from "../useEditorStore";

function options(t: TFunction<"panels">): { id: SymmetryConfig["type"]; label: string }[] {
  return [
    { id: "none", label: t("symmetryPanel.options.none") },
    { id: "horizontal", label: t("symmetryPanel.options.horizontal") },
    { id: "vertical", label: t("symmetryPanel.options.vertical") },
    { id: "both", label: t("symmetryPanel.options.both") },
    { id: "radial", label: t("symmetryPanel.options.radial") },
  ];
}

// docs/specs/06-symmetry.md — mode selector + (for radial) movable centre and interval.
export function SymmetryPanel({ store }: { store: EditorStore }) {
  const { t } = useTranslation("panels");
  const OPTIONS = options(t);
  const state = useEditorState(store);
  const selected = store.getSelectedPinPath();
  const config = selected ? selected.symmetry : state.symmetryDefaults;

  const setType = (type: SymmetryConfig["type"]) => store.setSymmetryConfig(symmetryConfigForType(type));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--text-tertiary)", textTransform: "uppercase" }}>
        {t("symmetryPanel.sectionTitle")}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
        {OPTIONS.map((o) => (
          <button
            key={o.id}
            className={`btn${config.type === o.id ? " btn-active" : ""}`}
            onClick={() => setType(o.id)}
            style={{ justifyContent: "center", borderRadius: "var(--radius-sm)", padding: "9px 4px", fontSize: 10.5, fontWeight: 600 }}
          >
            {o.label}
          </button>
        ))}
      </div>

      {config.type === "radial" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, background: "var(--bg-app)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: 10 }}>
          <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11.5, color: "var(--text-secondary)" }}>
            {t("symmetryPanel.interval")}
            <input
              type="number"
              className="mono"
              min={1}
              max={359}
              value={config.intervalDegrees}
              onChange={(e) => store.setSymmetryConfig({ ...config, intervalDegrees: Number(e.target.value) })}
              style={{ width: 60, background: "var(--bg-panel-2)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", padding: "3px 6px" }}
            />
          </label>
          <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11.5, color: "var(--text-secondary)" }}>
            {t("symmetryPanel.centreX")}
            <input
              type="number"
              className="mono"
              value={config.centre.x}
              onChange={(e) => store.setSymmetryConfig({ ...config, centre: { ...config.centre, x: Number(e.target.value) } })}
              style={{ width: 60, background: "var(--bg-panel-2)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", padding: "3px 6px" }}
            />
          </label>
          <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11.5, color: "var(--text-secondary)" }}>
            {t("symmetryPanel.centreY")}
            <input
              type="number"
              className="mono"
              value={config.centre.y}
              onChange={(e) => store.setSymmetryConfig({ ...config, centre: { ...config.centre, y: Number(e.target.value) } })}
              style={{ width: 60, background: "var(--bg-panel-2)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", padding: "3px 6px" }}
            />
          </label>
        </div>
      )}
    </div>
  );
}
