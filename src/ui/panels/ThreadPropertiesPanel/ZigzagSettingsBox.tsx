import { useTranslation } from "react-i18next";
import type { EditorStore, ZigzagSettings } from "../../../application/document";
import { CheckboxField } from "../fields/CheckboxField";
import { SliderField } from "../fields/SliderField";

// docs/specs/35-zigzag-parabolic-tools.md §Configuration — shown only while the
// Zig-zag tool is active (setThreadTool already clears any threadPath selection when
// switching to it, so this section and the dual-context selected/defaults fields above
// never compete for the same space). "Next-draw settings," same as threadDefaults —
// writes go straight to store.setZigzagSettings, never through HistoryStack.
export function ZigzagSettingsBox({ store, settings }: { store: EditorStore; settings: ZigzagSettings }) {
  const { t } = useTranslation("panels");
  return (
    <div className="thread-properties-panel__box">
      <div className="thread-properties-panel__section-title">{t("threadPropertiesPanel.zigzagSectionTitle")}</div>
      <SliderField label={t("threadPropertiesPanel.stepA")} value={settings.stepA} min={0} max={9} step={1} onChange={(v) => store.setZigzagSettings({ stepA: v })} />
      <SliderField label={t("threadPropertiesPanel.stepB")} value={settings.stepB} min={0} max={9} step={1} onChange={(v) => store.setZigzagSettings({ stepB: v })} />
      <CheckboxField label={t("threadPropertiesPanel.fullFill")} checked={settings.fullFill} onChange={(v) => store.setZigzagSettings({ fullFill: v })} />
    </div>
  );
}
