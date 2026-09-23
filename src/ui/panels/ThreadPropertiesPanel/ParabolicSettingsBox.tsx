import { useTranslation } from "react-i18next";
import type { EditorStore, ParabolicSettings } from "@application/document";
import { CheckboxField } from "@ui/panels/fields/CheckboxField";
import { SliderField } from "@ui/panels/fields/SliderField";

// Same shape as ZigzagSettingsBox plus Cycles, enabled only while Full-fill is
// checked — it has no effect otherwise (twoPinSequence.ts: cycles only applies to a
// same-CLOSED-path pair with fullFill on).
export function ParabolicSettingsBox({ store, settings }: { store: EditorStore; settings: ParabolicSettings }) {
  const { t } = useTranslation("panels");
  return (
    <div className="thread-properties-panel__box">
      <div className="thread-properties-panel__section-title">{t("threadPropertiesPanel.parabolicSectionTitle")}</div>
      <SliderField label={t("threadPropertiesPanel.stepA")} value={settings.stepA} min={0} max={9} step={1} onChange={(v) => store.setParabolicSettings({ stepA: v })} />
      <SliderField label={t("threadPropertiesPanel.stepB")} value={settings.stepB} min={0} max={9} step={1} onChange={(v) => store.setParabolicSettings({ stepB: v })} />
      <CheckboxField label={t("threadPropertiesPanel.fullFill")} checked={settings.fullFill} onChange={(v) => store.setParabolicSettings({ fullFill: v })} />
      <SliderField
        label={t("threadPropertiesPanel.cycles")}
        value={settings.cycles}
        min={1}
        max={20}
        step={1}
        disabled={!settings.fullFill}
        onChange={(v) => store.setParabolicSettings({ cycles: v })}
      />
    </div>
  );
}
