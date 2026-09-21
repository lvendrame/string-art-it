import { useTranslation } from "react-i18next";
import { threadPathStatistics, type EditorStore, type ParabolicSettings, type ZigzagSettings } from "../../application/document";
import { useEditorState } from "../useEditorStore";
import { CheckboxField } from "./fields/CheckboxField";
import { SliderField } from "./fields/SliderField";

export const PALETTE = ["#5b8def", "#edeff7", "#e8b449", "#d96c6c", "#8fd6c8"];

// docs/specs/34-keyboard-shortcuts.md — Shift+1/2/3 reuses this exact array-building
// logic (not just PALETTE) so the keyboard shortcut and this panel's own [1,2,3]
// buttons always agree on which colours survive a count change.
export function coloursForCount(colours: string[], n: number): string[] {
  return Array.from({ length: n }, (_, i) => colours[i] ?? PALETTE[i % PALETTE.length]);
}

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
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--text-tertiary)", textTransform: "uppercase" }}>
        {selected ? t("threadPropertiesPanel.titleSelected") : t("threadPropertiesPanel.titleDefaults")}
      </div>

      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--text-tertiary)", textTransform: "uppercase" }}>
        {t("threadPropertiesPanel.coloursSectionTitle")}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {[1, 2, 3].map((n) => (
          <button
            key={n}
            className={`btn${colours.length === n ? " btn-active" : ""}`}
            onClick={() => setColourCount(n)}
            style={{ flex: 1, justifyContent: "center", borderRadius: "var(--radius-sm)", padding: 9, fontSize: 12, fontWeight: 700 }}
          >
            {n}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {colours.map((c, i) => (
          <input
            key={i}
            type="color"
            value={c}
            onChange={(e) => store.setThreadProperty({ colours: colours.map((existing, idx) => (idx === i ? e.target.value : existing)) })}
            style={{ width: 24, height: 24, border: "1px solid var(--border-strong)", borderRadius: 5, background: "none", padding: 0 }}
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
        <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "var(--text-secondary)" }}>
          {t("threadPropertiesPanel.twistPitch")}
          <input
            type="number"
            className="mono"
            min={2}
            max={20}
            step={1}
            value={values.twistPitch}
            onChange={(e) => store.setThreadProperty({ twistPitch: Number(e.target.value) })}
            style={{ width: 60, background: "var(--bg-panel-2)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", padding: "4px 6px" }}
          />
        </label>
      )}

      {state.threadTool === "zigzag" && <ZigzagSettingsBox store={store} settings={state.zigzagSettings} />}
      {state.threadTool === "parabolic" && <ParabolicSettingsBox store={store} settings={state.parabolicSettings} />}

      {selected && <ThreadStatsBox thread={selected} pinLayers={state.pinLayers} />}
    </div>
  );
}

// docs/specs/35-zigzag-parabolic-tools.md §Configuration — shown only while the
// Zig-zag tool is active (setThreadTool already clears any threadPath selection when
// switching to it, so this section and the dual-context selected/defaults fields above
// never compete for the same space). "Next-draw settings," same as threadDefaults —
// writes go straight to store.setZigzagSettings, never through HistoryStack.
function ZigzagSettingsBox({ store, settings }: { store: EditorStore; settings: ZigzagSettings }) {
  const { t } = useTranslation("panels");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: 10, marginTop: 4 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--text-tertiary)", textTransform: "uppercase" }}>
        {t("threadPropertiesPanel.zigzagSectionTitle")}
      </div>
      <SliderField label={t("threadPropertiesPanel.stepA")} value={settings.stepA} min={0} max={9} step={1} onChange={(v) => store.setZigzagSettings({ stepA: v })} />
      <SliderField label={t("threadPropertiesPanel.stepB")} value={settings.stepB} min={0} max={9} step={1} onChange={(v) => store.setZigzagSettings({ stepB: v })} />
      <CheckboxField label={t("threadPropertiesPanel.fullFill")} checked={settings.fullFill} onChange={(v) => store.setZigzagSettings({ fullFill: v })} />
    </div>
  );
}

// Same shape as ZigzagSettingsBox plus Circles, enabled only while Full-fill is
// checked — it has no effect otherwise (twoPinSequence.ts: circles only applies to a
// same-CLOSED-path pair with fullFill on).
function ParabolicSettingsBox({ store, settings }: { store: EditorStore; settings: ParabolicSettings }) {
  const { t } = useTranslation("panels");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: 10, marginTop: 4 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--text-tertiary)", textTransform: "uppercase" }}>
        {t("threadPropertiesPanel.parabolicSectionTitle")}
      </div>
      <SliderField label={t("threadPropertiesPanel.stepA")} value={settings.stepA} min={0} max={9} step={1} onChange={(v) => store.setParabolicSettings({ stepA: v })} />
      <SliderField label={t("threadPropertiesPanel.stepB")} value={settings.stepB} min={0} max={9} step={1} onChange={(v) => store.setParabolicSettings({ stepB: v })} />
      <CheckboxField label={t("threadPropertiesPanel.fullFill")} checked={settings.fullFill} onChange={(v) => store.setParabolicSettings({ fullFill: v })} />
      <SliderField
        label={t("threadPropertiesPanel.circles")}
        value={settings.circles}
        min={1}
        max={20}
        step={1}
        disabled={!settings.fullFill}
        onChange={(v) => store.setParabolicSettings({ circles: v })}
      />
    </div>
  );
}

// docs/specs/17-statistics.md — same figures as the Statistics overlay's per-thread
// StatCard, surfaced inline so selecting a thread shows its stats without leaving
// Thread mode. Always derived live from the current document, never stored.
function ThreadStatsBox({ thread, pinLayers }: { thread: NonNullable<ReturnType<EditorStore["getSelectedThreadPath"]>>; pinLayers: Parameters<typeof threadPathStatistics>[1] }) {
  const { t } = useTranslation("panels");
  const stats = threadPathStatistics(thread, pinLayers);
  const rows: [string, string][] = [
    [t("threadPropertiesPanel.stats.segments"), String(stats.segments)],
    [t("threadPropertiesPanel.stats.threadLength"), `${(stats.lengthCm / 100).toFixed(2)} m`],
    [t("threadPropertiesPanel.stats.pinsVisited"), String(stats.pinsVisited)],
  ];

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: 10, display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--text-tertiary)", textTransform: "uppercase" }}>
        {t("threadPropertiesPanel.stats.title")}
      </div>
      {rows.map(([label, value]) => (
        <div key={label} className="mono" style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
          <span style={{ color: "var(--text-secondary)" }}>{label}</span>
          <span style={{ color: "var(--text-primary)" }}>{value}</span>
        </div>
      ))}
    </div>
  );
}
