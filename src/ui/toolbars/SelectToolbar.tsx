import { GitMerge, MousePointer2, Move, RotateCw, Scaling } from "lucide-react";
import { Tooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";
import type { ComponentType } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import type { EditorStore, SelectTool } from "../../application/document";
import { useEditorState } from "../useEditorStore";

const SELECT_TOOLBAR_TOOLTIP_ID = "select-toolbar-tooltip";

function tools(t: TFunction<"toolbars">): { id: SelectTool; label: string; icon: ComponentType<{ size?: number }>; tooltip: string; requiresSelection: boolean }[] {
  return [
    { id: "select", label: t("selectToolbar.tools.select.label"), icon: MousePointer2, tooltip: t("selectToolbar.tools.select.tooltip"), requiresSelection: false },
    { id: "move", label: t("selectToolbar.tools.move.label"), icon: Move, tooltip: t("selectToolbar.tools.move.tooltip"), requiresSelection: true },
    { id: "rotate", label: t("selectToolbar.tools.rotate.label"), icon: RotateCw, tooltip: t("selectToolbar.tools.rotate.tooltip"), requiresSelection: true },
    { id: "scale", label: t("selectToolbar.tools.scale.label"), icon: Scaling, tooltip: t("selectToolbar.tools.scale.tooltip"), requiresSelection: true },
    { id: "merge", label: t("selectToolbar.tools.merge.label"), icon: GitMerge, tooltip: t("selectToolbar.tools.merge.tooltip"), requiresSelection: false },
  ];
}

// docs/specs/09-selection-and-editing.md — the Edit-mode tool area.
export function SelectToolbar({ store }: { store: EditorStore }) {
  const { t } = useTranslation("toolbars");
  const state = useEditorState(store);
  const hasSelection = state.selection.type === "pinPath";
  const TOOLS = tools(t);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--text-tertiary)", textTransform: "uppercase" }}>
        {t("selectToolbar.sectionTitle")}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6 }}>
        {TOOLS.map((tool) => {
          const disabled = tool.requiresSelection && !hasSelection;
          return (
            <button
              key={tool.id}
              className={`btn${state.selectTool === tool.id ? " btn-active" : ""}`}
              disabled={disabled}
              onClick={() => store.setSelectTool(tool.id)}
              aria-label={tool.label}
              data-tooltip-id={SELECT_TOOLBAR_TOOLTIP_ID}
              data-tooltip-content={tool.tooltip}
              style={{ flexDirection: "column", borderRadius: "var(--radius-sm)", padding: "10px 4px 7px", gap: 5, fontSize: 11, fontWeight: 600 }}
            >
              <tool.icon size={16} />
              {tool.label}
            </button>
          );
        })}
      </div>
      <Tooltip id={SELECT_TOOLBAR_TOOLTIP_ID} place="top" />
    </div>
  );
}
