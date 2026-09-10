import type { EditorStore } from "../../application/document";
import { useEditorState } from "../useEditorStore";

// docs/specs/11-existing-object-editing: with no Pin Path selected, edits change the
// defaults for new objects; with one selected, edits change only that object. Both
// contexts are served by store.setPinProperty — this panel just shows the right values.
export function PinPropertiesPanel({ store }: { store: EditorStore }) {
  const state = useEditorState(store);
  const selected = store.getSelectedPinPath();
  const values = selected
    ? { spacing: selected.requestedSpacing, colour: selected.colour, diameter: selected.diameter, guideVisible: selected.guideVisible }
    : state.pinDefaults;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--text-tertiary)", textTransform: "uppercase" }}>
        Pin Properties {selected ? "(selected)" : "(defaults)"}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, background: "var(--bg-app)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: 12 }}>
        <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "var(--text-secondary)" }}>
          Spacing (cm)
          <input
            type="number"
            className="mono"
            min={0.1}
            step={0.1}
            value={values.spacing}
            onChange={(e) => store.setPinProperty({ spacing: Number(e.target.value) })}
            style={{ width: 70, background: "var(--bg-panel-2)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", padding: "4px 6px" }}
          />
        </label>
        {selected && (
          <div className="mono" style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--accent)" }}>
            <span>Actual gap</span>
            <span>{selected.actualSpacing.toFixed(2)} cm</span>
          </div>
        )}
        <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "var(--text-secondary)" }}>
          Diameter (mm)
          <input
            type="number"
            className="mono"
            min={0.1}
            step={0.1}
            value={values.diameter}
            onChange={(e) => store.setPinProperty({ diameter: Number(e.target.value) })}
            style={{ width: 70, background: "var(--bg-panel-2)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", padding: "4px 6px" }}
          />
        </label>
        <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "var(--text-secondary)" }}>
          Colour
          <input
            type="color"
            value={values.colour}
            onChange={(e) => store.setPinProperty({ colour: e.target.value })}
            style={{ width: 28, height: 20, border: "1px solid var(--border)", borderRadius: 4, background: "none", padding: 0 }}
          />
        </label>
        <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "var(--text-secondary)" }}>
          Guide visible
          <input type="checkbox" checked={values.guideVisible} onChange={(e) => store.setPinProperty({ guideVisible: e.target.checked })} />
        </label>
      </div>
    </div>
  );
}
