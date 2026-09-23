import { useTranslation } from "react-i18next";
import type { EditorStore } from "@application/document";
import { useEditorState } from "@ui/useEditorStore";
import "./PinPropertiesPanel.css";

// docs/specs/11-existing-object-editing: with no Pin Path selected, edits change the
// defaults for new objects; with one selected, edits change only that object. Both
// contexts are served by store.setPinProperty — this panel just shows the right values.
export function PinPropertiesPanel({ store }: { store: EditorStore }) {
  const { t } = useTranslation("panels");
  const state = useEditorState(store);
  const selected = store.getSelectedPinPath();
  const values = selected
    ? { spacing: selected.requestedSpacing, colour: selected.colour, diameter: selected.diameter, guideVisible: selected.guideVisible }
    : state.pinDefaults;

  return (
    <div className="pin-properties-panel">
      <div className="pin-properties-panel__section-title">
        {selected ? t("pinPropertiesPanel.titleSelected") : t("pinPropertiesPanel.titleDefaults")}
      </div>
      <div className="pin-properties-panel__box">
        <label className="pin-properties-panel__row">
          {t("pinPropertiesPanel.spacing")}
          <input
            type="number"
            className="mono pin-properties-panel__number-input"
            min={0.1}
            step={0.1}
            value={values.spacing}
            onChange={(e) => store.setPinProperty({ spacing: Number(e.target.value) })}
          />
        </label>
        {selected && (
          <div className="mono pin-properties-panel__actual-gap">
            <span>{t("pinPropertiesPanel.actualGap")}</span>
            <span>{selected.actualSpacing.toFixed(2)} cm</span>
          </div>
        )}
        <label className="pin-properties-panel__row">
          {t("pinPropertiesPanel.diameter")}
          <input
            type="number"
            className="mono pin-properties-panel__number-input"
            min={0.1}
            step={0.1}
            value={values.diameter}
            onChange={(e) => store.setPinProperty({ diameter: Number(e.target.value) })}
          />
        </label>
        <label className="pin-properties-panel__row">
          {t("pinPropertiesPanel.colour")}
          <input
            type="color"
            value={values.colour}
            onChange={(e) => store.setPinProperty({ colour: e.target.value })}
            className="pin-properties-panel__color-input"
          />
        </label>
        <label className="pin-properties-panel__row">
          {t("pinPropertiesPanel.guideVisible")}
          <input type="checkbox" checked={values.guideVisible} onChange={(e) => store.setPinProperty({ guideVisible: e.target.checked })} />
        </label>
      </div>
    </div>
  );
}
