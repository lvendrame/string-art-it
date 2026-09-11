import { GitMerge, MousePointer2, Move, RotateCw } from "lucide-react";
import { Tooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";
import type { ComponentType } from "react";
import type { EditorStore, SelectTool } from "../../application/document";
import { useEditorState } from "../useEditorStore";

const SELECT_TOOLBAR_TOOLTIP_ID = "select-toolbar-tooltip";

const TOOLS: { id: SelectTool; label: string; icon: ComponentType<{ size?: number }>; tooltip: string; requiresSelection: boolean }[] = [
  { id: "select", label: "Select", icon: MousePointer2, tooltip: "Click a pin to select its Pin Path.", requiresSelection: false },
  { id: "move", label: "Move", icon: Move, tooltip: "Drag to translate the selected Pin Path.", requiresSelection: true },
  { id: "rotate", label: "Rotation", icon: RotateCw, tooltip: "Drag left or right from any point to rotate the selected Pin Path around that point.", requiresSelection: true },
  { id: "merge", label: "Merge", icon: GitMerge, tooltip: "Click pins to select them, then right-click to merge them into one pin at their midpoint.", requiresSelection: false },
];

// docs/specs/09-selection-and-editing.md — the Edit-mode tool area.
export function SelectToolbar({ store }: { store: EditorStore }) {
  const state = useEditorState(store);
  const hasSelection = state.selection.type === "pinPath";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--text-tertiary)", textTransform: "uppercase" }}>
        Edit Tools
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6 }}>
        {TOOLS.map((t) => {
          const disabled = t.requiresSelection && !hasSelection;
          return (
            <button
              key={t.id}
              className={`btn${state.selectTool === t.id ? " btn-active" : ""}`}
              disabled={disabled}
              onClick={() => store.setSelectTool(t.id)}
              aria-label={t.label}
              data-tooltip-id={SELECT_TOOLBAR_TOOLTIP_ID}
              data-tooltip-content={t.tooltip}
              style={{ flexDirection: "column", borderRadius: "var(--radius-sm)", padding: "10px 4px 7px", gap: 5, fontSize: 11, fontWeight: 600 }}
            >
              <t.icon size={16} />
              {t.label}
            </button>
          );
        })}
      </div>
      <Tooltip id={SELECT_TOOLBAR_TOOLTIP_ID} place="top" />
    </div>
  );
}
