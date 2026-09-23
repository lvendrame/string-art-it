import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { symmetryConfigForType, type EditorStore, type SymmetryConfig } from "@application/document";
import { useEditorState } from "@ui/useEditorStore";
import "./SymmetryPanel.css";

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
    <div className="symmetry-panel">
      <div className="symmetry-panel__section-title">{t("symmetryPanel.sectionTitle")}</div>
      <div className="symmetry-panel__grid">
        {OPTIONS.map((o) => (
          <button
            key={o.id}
            className={`btn symmetry-panel__option-btn${config.type === o.id ? " btn-active" : ""}`}
            onClick={() => setType(o.id)}
          >
            {o.label}
          </button>
        ))}
      </div>

      {config.type === "radial" && (
        <div className="symmetry-panel__radial-box">
          <label className="symmetry-panel__row">
            {t("symmetryPanel.interval")}
            <input
              type="number"
              className="mono symmetry-panel__number-input"
              min={1}
              max={359}
              value={config.intervalDegrees}
              onChange={(e) => store.setSymmetryConfig({ ...config, intervalDegrees: Number(e.target.value) })}
            />
          </label>
          <label className="symmetry-panel__row">
            {t("symmetryPanel.centreX")}
            <input
              type="number"
              className="mono symmetry-panel__number-input"
              value={config.centre.x}
              onChange={(e) => store.setSymmetryConfig({ ...config, centre: { ...config.centre, x: Number(e.target.value) } })}
            />
          </label>
          <label className="symmetry-panel__row">
            {t("symmetryPanel.centreY")}
            <input
              type="number"
              className="mono symmetry-panel__number-input"
              value={config.centre.y}
              onChange={(e) => store.setSymmetryConfig({ ...config, centre: { ...config.centre, y: Number(e.target.value) } })}
            />
          </label>
        </div>
      )}
    </div>
  );
}
