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

// docs/specs/09-selection-and-editing.md — editable geometry fields per shape. Editing
// any field recalculates pins via store.updatePinPathGeometry.
export function SelectionPanel({ store }: { store: EditorStore }) {
  const state = useEditorState(store);
  if (state.selection.type !== "pinPath") {
    return (
      <div style={{ padding: 24, color: "var(--text-tertiary)", fontSize: 12 }}>
        Click a pin to select its Pin Path.
      </div>
    );
  }

  const selected = store.getSelectedPinPath();
  if (!selected) return null;
  const { layerId, pathId } = state.selection;
  const g = selected.geometry;

  const set = (next: PinPathGeometry) => store.updatePinPathGeometry(layerId, pathId, next);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--text-tertiary)", textTransform: "uppercase" }}>
        Selection — {g.type}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, background: "var(--bg-app)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: 12 }}>
        {g.type === "line" && (
          <>
            <NumberField label="Start X" value={g.start.x} onChange={(v) => set({ ...g, start: { ...g.start, x: v } })} />
            <NumberField label="Start Y" value={g.start.y} onChange={(v) => set({ ...g, start: { ...g.start, y: v } })} />
            <NumberField label="End X" value={g.end.x} onChange={(v) => set({ ...g, end: { ...g.end, x: v } })} />
            <NumberField label="End Y" value={g.end.y} onChange={(v) => set({ ...g, end: { ...g.end, y: v } })} />
          </>
        )}
        {g.type === "circle" && (
          <>
            <NumberField label="Centre X" value={g.center.x} onChange={(v) => set({ ...g, center: { ...g.center, x: v } })} />
            <NumberField label="Centre Y" value={g.center.y} onChange={(v) => set({ ...g, center: { ...g.center, y: v } })} />
            <NumberField label="Radius" value={g.radius} onChange={(v) => set({ ...g, radius: Math.max(v, 0.01) })} />
          </>
        )}
        {g.type === "ellipse" && (
          <>
            <NumberField label="Centre X" value={g.center.x} onChange={(v) => set({ ...g, center: { ...g.center, x: v } })} />
            <NumberField label="Centre Y" value={g.center.y} onChange={(v) => set({ ...g, center: { ...g.center, y: v } })} />
            <NumberField label="Radius X" value={g.radiusX} onChange={(v) => set({ ...g, radiusX: Math.max(v, 0.01) })} />
            <NumberField label="Radius Y" value={g.radiusY} onChange={(v) => set({ ...g, radiusY: Math.max(v, 0.01) })} />
            <NumberField label="Rotation" value={g.rotation} onChange={(v) => set({ ...g, rotation: v })} />
          </>
        )}
        {(g.type === "rectangle" || g.type === "square") && (
          <>
            <NumberField label="Position X" value={g.position.x} onChange={(v) => set({ ...g, position: { ...g.position, x: v } })} />
            <NumberField label="Position Y" value={g.position.y} onChange={(v) => set({ ...g, position: { ...g.position, y: v } })} />
            {g.type === "rectangle" ? (
              <>
                <NumberField label="Width" value={g.width} onChange={(v) => set({ ...g, width: Math.max(v, 0.01) })} />
                <NumberField label="Height" value={g.height} onChange={(v) => set({ ...g, height: Math.max(v, 0.01) })} />
              </>
            ) : (
              <NumberField label="Side" value={g.side} onChange={(v) => set({ ...g, side: Math.max(v, 0.01) })} />
            )}
            <NumberField label="Rotation" value={g.rotation} onChange={(v) => set({ ...g, rotation: v })} />
          </>
        )}
        {(g.type === "regular-polygon" || g.type === "star" || g.type === "polygram") && (
          <>
            <NumberField label="Centre X" value={g.center.x} onChange={(v) => set({ ...g, center: { ...g.center, x: v } })} />
            <NumberField label="Centre Y" value={g.center.y} onChange={(v) => set({ ...g, center: { ...g.center, y: v } })} />
            <NumberField label="Rotation" value={g.rotation} onChange={(v) => set({ ...g, rotation: v })} />
            {g.type === "regular-polygon" && <NumberField label="Radius" value={g.radius} onChange={(v) => set({ ...g, radius: Math.max(v, 0.01) })} />}
            {g.type === "star" && (
              <>
                <NumberField label="Outer radius" value={g.outerRadius} onChange={(v) => set({ ...g, outerRadius: Math.max(v, 0.01) })} />
                <NumberField label="Inner radius" value={g.innerRadius} onChange={(v) => set({ ...g, innerRadius: Math.max(v, 0.01) })} />
              </>
            )}
            {g.type === "polygram" && <NumberField label="Radius" value={g.radius} onChange={(v) => set({ ...g, radius: Math.max(v, 0.01) })} />}
          </>
        )}
      </div>
      <SymmetryPanel store={store} />
      <button
        className="btn"
        onClick={() => store.deletePinPath(layerId, pathId)}
        style={{ borderRadius: "var(--radius-sm)", padding: 9, justifyContent: "center", fontSize: 12, fontWeight: 600, color: "var(--danger)", borderColor: "var(--danger-soft)" }}
      >
        Delete Pin Path
      </button>
    </div>
  );
}
