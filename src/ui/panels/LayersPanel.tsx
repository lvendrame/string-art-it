import { useState } from "react";
import { ChevronDown, ChevronUp, Copy, Plus, Trash2 } from "lucide-react";
import type { EditorStore } from "../../application/document";
import { useEditorState } from "../useEditorStore";

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg viewBox="0 0 24 24" width={14} height={14}>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" stroke="currentColor" strokeWidth={1.5} fill="none" />
      <circle cx={12} cy={12} r={3} stroke="currentColor" strokeWidth={1.5} fill="none" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" width={14} height={14}>
      <path d="M3 3l18 18M10.6 10.6a3 3 0 0 0 4.2 4.2M6.5 6.7C4 8.3 2 12 2 12s4 7 10 7c1.7 0 3.2-.4 4.5-1.1M9.9 5.2A10 10 0 0 1 12 5c6 0 10 7 10 7a15 15 0 0 1-2.3 3.1" stroke="currentColor" strokeWidth={1.5} fill="none" strokeLinecap="round" />
    </svg>
  );
}

function LockIcon({ locked }: { locked: boolean }) {
  return locked ? (
    <svg viewBox="0 0 24 24" width={14} height={14}>
      <rect x={5} y={11} width={14} height={9} rx={1.5} stroke="currentColor" strokeWidth={1.5} fill="none" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" strokeWidth={1.5} fill="none" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" width={14} height={14}>
      <rect x={5} y={11} width={14} height={9} rx={1.5} stroke="currentColor" strokeWidth={1.5} fill="none" />
      <path d="M8 11V7a4 4 0 0 1 7.5-2" stroke="currentColor" strokeWidth={1.5} fill="none" strokeLinecap="round" />
    </svg>
  );
}

interface Row {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
}

function LayerRow({
  layer,
  active,
  onSelect,
  onToggleVisible,
  onToggleLocked,
  onRename,
}: {
  layer: Row;
  active: boolean;
  onSelect: () => void;
  onToggleVisible: () => void;
  onToggleLocked: () => void;
  onRename: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(layer.name);

  return (
    <div
      onClick={onSelect}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: "9px 16px",
        cursor: "pointer",
        borderLeft: `2px solid ${active ? "var(--accent)" : "transparent"}`,
        background: active ? "var(--accent-soft)" : "transparent",
      }}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onToggleVisible(); }}
        style={{ border: "none", background: "transparent", padding: 2, color: layer.visible ? "var(--text-secondary)" : "var(--text-tertiary)", cursor: "pointer" }}
        aria-label={layer.visible ? `Hide ${layer.name}` : `Show ${layer.name}`}
      >
        <EyeIcon open={layer.visible} />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onToggleLocked(); }}
        style={{ border: "none", background: "transparent", padding: 2, color: layer.locked ? "var(--accent)" : "var(--text-tertiary)", cursor: "pointer" }}
        aria-label={layer.locked ? `Unlock ${layer.name}` : `Lock ${layer.name}`}
      >
        <LockIcon locked={layer.locked} />
      </button>
      {editing ? (
        <input
          autoFocus
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onBlur={() => { setEditing(false); onRename(draftName); }}
          onKeyDown={(e) => { if (e.key === "Enter") { setEditing(false); onRename(draftName); } }}
          style={{ flex: 1, fontSize: 12.5, background: "var(--bg-panel-2)", border: "1px solid var(--border)", borderRadius: 4, color: "var(--text-primary)", padding: "2px 4px" }}
        />
      ) : (
        <span
          onDoubleClick={(e) => { e.stopPropagation(); setDraftName(layer.name); setEditing(true); }}
          style={{ flex: 1, fontSize: 12.5, color: layer.visible ? "var(--text-primary)" : "var(--text-tertiary)" }}
        >
          {layer.name}
        </span>
      )}
    </div>
  );
}

// docs/specs/13-layers.md + 32/33 — two independent layer systems, same row anatomy.
export function LayersPanel({ store }: { store: EditorStore }) {
  const state = useEditorState(store);
  const isPin = state.layerPanelTab === "pin";

  const rows: Row[] = isPin ? state.pinLayers : state.threadLayers;
  const activeId = isPin ? state.activePinLayerId : state.activeThreadLayerId;

  const actions = isPin
    ? {
        select: (id: string) => store.setActivePinLayer(id),
        toggleVisible: (id: string) => store.togglePinLayerVisible(id),
        toggleLocked: (id: string) => store.togglePinLayerLocked(id),
        rename: (id: string, name: string) => store.renamePinLayer(id, name),
        add: () => store.addPinLayer(),
        duplicate: (id: string) => store.duplicatePinLayer(id),
        remove: (id: string) => store.deletePinLayer(id),
        reorder: (id: string, dir: -1 | 1) => store.reorderPinLayer(id, dir),
      }
    : {
        select: (id: string) => store.setActiveThreadLayer(id),
        toggleVisible: (id: string) => store.toggleThreadLayerVisible(id),
        toggleLocked: (id: string) => store.toggleThreadLayerLocked(id),
        rename: (id: string, name: string) => store.renameThreadLayer(id, name),
        add: () => store.addThreadLayer(),
        duplicate: (id: string) => store.duplicateThreadLayer(id),
        remove: (id: string) => store.deleteThreadLayer(id),
        reorder: (id: string, dir: -1 | 1) => store.reorderThreadLayer(id, dir),
      };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", padding: "0 16px", gap: 4, borderBottom: "1px solid var(--border)" }}>
        <button
          onClick={() => store.setLayerPanelTab("pin")}
          style={{ flex: 1, justifyContent: "center", border: "none", borderBottom: `2px solid ${isPin ? "var(--accent)" : "transparent"}`, borderRadius: 0, padding: "9px 0", fontSize: 12, fontWeight: 700, background: "transparent", color: isPin ? "var(--text-primary)" : "var(--text-tertiary)", cursor: "pointer" }}
        >
          Pin Layers
        </button>
        <button
          onClick={() => store.setLayerPanelTab("thread")}
          style={{ flex: 1, justifyContent: "center", border: "none", borderBottom: `2px solid ${!isPin ? "var(--accent)" : "transparent"}`, borderRadius: 0, padding: "9px 0", fontSize: 12, fontWeight: 700, background: "transparent", color: !isPin ? "var(--text-primary)" : "var(--text-tertiary)", cursor: "pointer" }}
        >
          Thread Layers
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {rows.map((layer) => (
          <LayerRow
            key={layer.id}
            layer={layer}
            active={layer.id === activeId}
            onSelect={() => actions.select(layer.id)}
            onToggleVisible={() => actions.toggleVisible(layer.id)}
            onToggleLocked={() => actions.toggleLocked(layer.id)}
            onRename={(name) => actions.rename(layer.id, name.trim() || layer.name)}
          />
        ))}
      </div>

      <div style={{ display: "flex", gap: 6, padding: 10, borderTop: "1px solid var(--border)" }}>
        <button className="btn" onClick={actions.add} style={{ flex: 1, justifyContent: "center", borderRadius: "var(--radius-sm)", padding: 7, fontSize: 11.5, gap: 4 }}>
          <Plus size={13} />
          New Layer
        </button>
        <button className="btn" onClick={() => actions.duplicate(activeId)} style={{ flex: 1, justifyContent: "center", borderRadius: "var(--radius-sm)", padding: 7, fontSize: 11.5, gap: 4 }}>
          <Copy size={13} />
          Duplicate
        </button>
        <button aria-label="Move layer up" className="btn" onClick={() => actions.reorder(activeId, -1)} style={{ borderRadius: "var(--radius-sm)", padding: "7px 10px", fontSize: 11.5 }}>
          <ChevronUp size={14} />
        </button>
        <button aria-label="Move layer down" className="btn" onClick={() => actions.reorder(activeId, 1)} style={{ borderRadius: "var(--radius-sm)", padding: "7px 10px", fontSize: 11.5 }}>
          <ChevronDown size={14} />
        </button>
        <button
          className="btn"
          onClick={() => rows.length > 1 && actions.remove(activeId)}
          disabled={rows.length <= 1}
          style={{ borderRadius: "var(--radius-sm)", padding: "7px 10px", fontSize: 11.5, color: "var(--danger)", gap: 4 }}
        >
          <Trash2 size={13} />
          Delete
        </button>
      </div>
    </div>
  );
}

