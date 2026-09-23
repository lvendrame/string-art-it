import { useTranslation } from "react-i18next";
import type { EditorStore } from "@application/document";
import { useEditorState } from "@ui/useEditorStore";
import { SliderField } from "@ui/panels/fields/SliderField";
import { coloursForCount } from "@ui/panels/threadColourPalette";
import { ZigzagSettingsBox } from "./ZigzagSettingsBox";
import { ParabolicSettingsBox } from "./ParabolicSettingsBox";
import { ThreadStatsBox } from "./ThreadStatsBox";
import "./ThreadPropertiesPanel.css";

// docs/specs/27-thread-select-tool.md — dual-context, same pattern as
// PinPropertiesPanel: with a Thread Path selected, these fields edit it; otherwise
// they edit the defaults used by the next drawn thread. One set of fields serves both
// contexts via store.setThreadProperty, so there's never a duplicate colour/width
// control shown at the same time.
export function ThreadPropertiesPanel({ store }: { store: EditorStore }) {
  const { t } = useTranslation("panels");
  const state = useEditorState(store);
  const selected = store.getSelectedThreadPath();
  const values = selected ? { colours: selected.colours, width: selected.width, twistPitch: selected.twistPitch } : state.threadDefaults;
  const colours = values.colours;

  function setColourCount(n: number) {
    store.setThreadProperty({ colours: coloursForCount(colours, n) });
  }

  return (
    <div className="thread-properties-panel">
      <div className="thread-properties-panel__section-title">
        {selected ? t("threadPropertiesPanel.titleSelected") : t("threadPropertiesPanel.titleDefaults")}
      </div>

      <div className="thread-properties-panel__section-title">{t("threadPropertiesPanel.coloursSectionTitle")}</div>
      <div className="thread-properties-panel__colour-count-row">
        {[1, 2, 3].map((n) => (
          <button
            key={n}
            className={`btn thread-properties-panel__colour-count-btn${colours.length === n ? " btn-active" : ""}`}
            onClick={() => setColourCount(n)}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="thread-properties-panel__swatches">
        {colours.map((c, i) => (
          <input
            key={i}
            type="color"
            value={c}
            onChange={(e) => store.setThreadProperty({ colours: colours.map((existing, idx) => (idx === i ? e.target.value : existing)) })}
            className="thread-properties-panel__swatch"
          />
        ))}
      </div>

      <SliderField
        label={t("threadPropertiesPanel.width")}
        value={values.width}
        min={0.5}
        max={5}
        step={0.5}
        onChange={(v) => store.setThreadProperty({ width: v })}
      />

      {colours.length > 1 && (
        <label className="thread-properties-panel__row">
          {t("threadPropertiesPanel.twistPitch")}
          <input
            type="number"
            className="mono thread-properties-panel__number-input"
            min={2}
            max={20}
            step={1}
            value={values.twistPitch}
            onChange={(e) => store.setThreadProperty({ twistPitch: Number(e.target.value) })}
          />
        </label>
      )}

      {state.threadTool === "zigzag" && <ZigzagSettingsBox store={store} settings={state.zigzagSettings} />}
      {state.threadTool === "parabolic" && <ParabolicSettingsBox store={store} settings={state.parabolicSettings} />}

      {selected && <ThreadStatsBox thread={selected} pinLayers={state.pinLayers} />}
    </div>
  );
}
