import { useTranslation } from "react-i18next";
import type { EditorStore, RadialSettings } from "@application/document";
import { SliderField } from "@ui/panels/fields/SliderField";

// docs/specs/37-radial-thread-tool.md §Configuration — shown only while the Radial
// tool is active. Next-draw settings, never routed through HistoryStack.
export function RadialSettingsBox({ store, settings }: { store: EditorStore; settings: RadialSettings }) {
  const { t } = useTranslation("panels");
  return (
    <div className="thread-properties-panel__box">
      <div className="thread-properties-panel__section-title">{t("threadPropertiesPanel.radialSectionTitle")}</div>
      <SliderField label={t("threadPropertiesPanel.step")} value={settings.step} min={1} max={10} step={1} onChange={(v) => store.setRadialSettings({ step: v })} />
    </div>
  );
}
