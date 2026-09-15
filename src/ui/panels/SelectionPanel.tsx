import { useTranslation } from "react-i18next";
import type { EditorStore, PinPathGeometry } from "../../application/document";
import { useEditorState } from "../useEditorStore";
import { SymmetryPanel } from "./SymmetryPanel";

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "var(--text-secondary)" }}>
      {label}
      <input
        type="number"
        className="mono"
        step={0.1}
        value={Number(value.toFixed(3))}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: 80, background: "var(--bg-panel-2)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", padding: "4px 6px" }}
      />
    </label>
  );
}

function SummaryMessage({ text }: { text: string }) {
  return (
    <div style={{ color: "var(--text-secondary)", fontSize: 12, background: "var(--bg-app)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: 12 }}>
      {text}
    </div>
  );
}

// docs/specs/09-selection-and-editing.md, docs/specs/26-edit-mode-multi-select.md —
// editable geometry fields per shape when exactly one Pin Path is selected. Editing
// any field recalculates pins via store.updatePinPathGeometry. A multi-path or
// pins-granularity selection shows a summary only — no per-shape fields, no delete
// action (multi-selection delete isn't part of this pass, a known scope gap per
// docs/specs/26-edit-mode-multi-select.md).
export function SelectionPanel({ store }: { store: EditorStore }) {
  const { t } = useTranslation("panels");
  const state = useEditorState(store);

  if (state.selection.type === "pins") {
    const paths = new Set(state.selection.refs.map((r) => r.pathId));
    return <SummaryMessage text={t("selectionPanel.multiPinsSelected", { count: state.selection.refs.length, paths: paths.size })} />;
  }

  if (state.selection.type !== "pinPaths") {
    return (
      <div style={{ color: "var(--text-tertiary)", fontSize: 12 }}>
        {t("selectionPanel.emptyMessage")}
      </div>
    );
  }

  if (state.selection.refs.length > 1) {
    const totalPins = store.getSelectedPinPaths().reduce((sum, p) => sum + p.pins.length, 0);
    return <SummaryMessage text={t("selectionPanel.multiPathsSelected", { count: state.selection.refs.length, pins: totalPins })} />;
  }

  const selected = store.getSelectedPinPath();
  if (!selected) return null;
  const { layerId, pathId } = state.selection.refs[0];
  const g = selected.geometry;

  const set = (next: PinPathGeometry) => store.updatePinPathGeometry(layerId, pathId, next);
  const f = (key: string) => t(`selectionPanel.fields.${key}`);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--text-tertiary)", textTransform: "uppercase" }}>
        {t("selectionPanel.title", { type: t(`selectionPanel.shapeTypes.${g.type}`) })}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, background: "var(--bg-app)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: 12 }}>
        <NumberField
          label={t("selectionPanel.pinDistance")}
          value={selected.requestedSpacing}
          onChange={(v) => store.setPinProperty({ spacing: Math.max(v, 0.01) })}
        />
        {g.type === "line" && (
          <>
            <NumberField label={f("startX")} value={g.start.x} onChange={(v) => set({ ...g, start: { ...g.start, x: v } })} />
            <NumberField label={f("startY")} value={g.start.y} onChange={(v) => set({ ...g, start: { ...g.start, y: v } })} />
            <NumberField label={f("endX")} value={g.end.x} onChange={(v) => set({ ...g, end: { ...g.end, x: v } })} />
            <NumberField label={f("endY")} value={g.end.y} onChange={(v) => set({ ...g, end: { ...g.end, y: v } })} />
          </>
        )}
        {g.type === "circle" && (
          <>
            <NumberField label={f("centreX")} value={g.center.x} onChange={(v) => set({ ...g, center: { ...g.center, x: v } })} />
            <NumberField label={f("centreY")} value={g.center.y} onChange={(v) => set({ ...g, center: { ...g.center, y: v } })} />
            <NumberField label={f("radius")} value={g.radius} onChange={(v) => set({ ...g, radius: Math.max(v, 0.01) })} />
          </>
        )}
        {g.type === "ellipse" && (
          <>
            <NumberField label={f("centreX")} value={g.center.x} onChange={(v) => set({ ...g, center: { ...g.center, x: v } })} />
            <NumberField label={f("centreY")} value={g.center.y} onChange={(v) => set({ ...g, center: { ...g.center, y: v } })} />
            <NumberField label={f("radiusX")} value={g.radiusX} onChange={(v) => set({ ...g, radiusX: Math.max(v, 0.01) })} />
            <NumberField label={f("radiusY")} value={g.radiusY} onChange={(v) => set({ ...g, radiusY: Math.max(v, 0.01) })} />
            <NumberField label={f("rotation")} value={g.rotation} onChange={(v) => set({ ...g, rotation: v })} />
          </>
        )}
        {(g.type === "rectangle" || g.type === "square") && (
          <>
            <NumberField label={f("positionX")} value={g.position.x} onChange={(v) => set({ ...g, position: { ...g.position, x: v } })} />
            <NumberField label={f("positionY")} value={g.position.y} onChange={(v) => set({ ...g, position: { ...g.position, y: v } })} />
            {g.type === "rectangle" ? (
              <>
                <NumberField label={f("width")} value={g.width} onChange={(v) => set({ ...g, width: Math.max(v, 0.01) })} />
                <NumberField label={f("height")} value={g.height} onChange={(v) => set({ ...g, height: Math.max(v, 0.01) })} />
              </>
            ) : (
              <NumberField label={f("side")} value={g.side} onChange={(v) => set({ ...g, side: Math.max(v, 0.01) })} />
            )}
            <NumberField label={f("rotation")} value={g.rotation} onChange={(v) => set({ ...g, rotation: v })} />
          </>
        )}
        {(g.type === "regular-polygon" || g.type === "star" || g.type === "polygram") && (
          <>
            <NumberField label={f("centreX")} value={g.center.x} onChange={(v) => set({ ...g, center: { ...g.center, x: v } })} />
            <NumberField label={f("centreY")} value={g.center.y} onChange={(v) => set({ ...g, center: { ...g.center, y: v } })} />
            <NumberField label={f("rotation")} value={g.rotation} onChange={(v) => set({ ...g, rotation: v })} />
            {g.type === "regular-polygon" && <NumberField label={f("radius")} value={g.radius} onChange={(v) => set({ ...g, radius: Math.max(v, 0.01) })} />}
            {g.type === "star" && (
              <>
                <NumberField label={f("outerRadius")} value={g.outerRadius} onChange={(v) => set({ ...g, outerRadius: Math.max(v, 0.01) })} />
                <NumberField label={f("innerRadius")} value={g.innerRadius} onChange={(v) => set({ ...g, innerRadius: Math.max(v, 0.01) })} />
              </>
            )}
            {g.type === "polygram" && <NumberField label={f("radius")} value={g.radius} onChange={(v) => set({ ...g, radius: Math.max(v, 0.01) })} />}
          </>
        )}
      </div>
      <SymmetryPanel store={store} />
      <button
        className="btn"
        onClick={() => store.deletePinPath(layerId, pathId)}
        style={{ borderRadius: "var(--radius-sm)", padding: 9, justifyContent: "center", fontSize: 12, fontWeight: 600, color: "var(--danger)", borderColor: "var(--danger-soft)" }}
      >
        {t("selectionPanel.deletePinPath")}
      </button>
    </div>
  );
}
