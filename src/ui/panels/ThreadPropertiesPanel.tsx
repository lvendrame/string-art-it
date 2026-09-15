import { useTranslation } from "react-i18next";
import type { EditorStore } from "../../application/document";
import { useEditorState } from "../useEditorStore";

const PALETTE = ["#5b8def", "#edeff7", "#e8b449", "#d96c6c", "#8fd6c8"];

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
    const next = Array.from({ length: n }, (_, i) => colours[i] ?? PALETTE[i % PALETTE.length]);
    store.setThreadProperty({ colours: next });
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

      <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
        {t("threadPropertiesPanel.width")}
        <input
          type="number"
          className="mono"
          min={0.5}
          step={0.5}
          value={values.width}
          onChange={(e) => store.setThreadProperty({ width: Number(e.target.value) })}
          style={{ width: 60, background: "var(--bg-panel-2)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", padding: "4px 6px" }}
        />
      </label>

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
    </div>
  );
}
