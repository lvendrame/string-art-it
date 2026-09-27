import { useTranslation } from "react-i18next";
import { maxRepeatColours, type EditorStore, type RepeatSettings } from "@application/document";
import { CheckboxField } from "@ui/panels/fields/CheckboxField";
import { ColourListField } from "@ui/panels/fields/ColourListField";

const MIN_CYCLES = 1;
const MAX_CYCLES = 20;

function clampCycles(value: number): number {
  return Math.min(MAX_CYCLES, Math.max(MIN_CYCLES, Math.round(value) || MIN_CYCLES));
}

// docs/specs/38-repeat-pattern-tool.md §Configuration — Cycles is read-only while
// Full-fill decides the cycle count; each colour paints one group in turn.
export function RepeatSettingsBox({ store, settings }: { store: EditorStore; settings: RepeatSettings }) {
  const { t } = useTranslation("panels");
  const maxColours = maxRepeatColours(settings.cycles);
  const colours = settings.colours.slice(0, maxColours);

  return (
    <div className="thread-properties-panel__box">
      <div className="thread-properties-panel__section-title">{t("threadPropertiesPanel.repeatSectionTitle")}</div>
      <label className="thread-properties-panel__row">
        {t("threadPropertiesPanel.cycles")}
        <input
          type="number"
          className="mono thread-properties-panel__number-input"
          min={MIN_CYCLES}
          max={MAX_CYCLES}
          step={1}
          value={settings.cycles}
          readOnly={settings.fullFill}
          disabled={settings.fullFill}
          onChange={(e) => store.setRepeatSettings({ cycles: clampCycles(Number(e.target.value)) })}
        />
      </label>
      <CheckboxField label={t("threadPropertiesPanel.fullFill")} checked={settings.fullFill} onChange={(v) => store.setRepeatSettings({ fullFill: v })} />
      <ColourListField
        colours={colours}
        max={maxColours}
        onChange={(next) => store.setRepeatSettings({ colours: next })}
        labels={{
          title: t("threadPropertiesPanel.coloursSectionTitle"),
          add: t("threadPropertiesPanel.addColour"),
          remove: t("threadPropertiesPanel.removeColour"),
          colourN: (n) => t("threadPropertiesPanel.colourN", { n }),
          note: t("threadPropertiesPanel.repeatColoursMax", { max: maxColours }),
        }}
      />
    </div>
  );
}
