import { GitMerge, MousePointer2, Move, RotateCw, Scaling } from "lucide-react";
import { Tooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";
import type { ComponentType } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { canCommitSelectionMerge, type EditorStore, type SelectTool } from "@application/document";
import { useEditorState } from "@ui/useEditorStore";
import { SELECT_TOOL_SHORTCUT_KEY } from "@ui/toolbars/selectToolShortcuts";
import { GranularitySwitch } from "./GranularitySwitch";
import "./SelectToolbar.css";

const SELECT_TOOLBAR_TOOLTIP_ID = "select-toolbar-tooltip";

function tools(t: TFunction<"toolbars">): { id: SelectTool; label: string; icon: ComponentType<{ size?: number }>; tooltip: string; requiresSelection: boolean }[] {
  return [
    { id: "select", label: t("selectToolbar.tools.select.label"), icon: MousePointer2, tooltip: t("selectToolbar.tools.select.tooltip"), requiresSelection: false },
    { id: "move", label: t("selectToolbar.tools.move.label"), icon: Move, tooltip: t("selectToolbar.tools.move.tooltip"), requiresSelection: true },
    { id: "rotate", label: t("selectToolbar.tools.rotate.label"), icon: RotateCw, tooltip: t("selectToolbar.tools.rotate.tooltip"), requiresSelection: true },
    { id: "scale", label: t("selectToolbar.tools.scale.label"), icon: Scaling, tooltip: t("selectToolbar.tools.scale.tooltip"), requiresSelection: true },
  ];
}

// docs/specs/26-edit-mode-multi-select.md, docs/specs/18-design-system.md §Labeled
// slide switch — a track+knob control flanked by two clickable end labels, for a
// mutually-exclusive 2-way choice the user explicitly wants rendered as a literal
// switch rather than the Segmented mode switcher pattern (which reads as tabs, not a
// toggle). Track visual size (40x20) stays inside a 44x32 hit target per
// 18-design-system.md's 32px minimum interactive size — the extra hit area is
// invisible padding, same convention icon buttons already use.
// docs/specs/09-selection-and-editing.md, docs/specs/26-edit-mode-multi-select.md —
// the Edit-mode tool area, now preceded by the Pin Path/Pins granularity switch.
export function SelectToolbar({ store }: { store: EditorStore }) {
  const { t } = useTranslation("toolbars");
  const state = useEditorState(store);
  const hasSelection = state.selection.type === "pinPaths" || state.selection.type === "pins";
  const canMerge = canCommitSelectionMerge(state.selection);
  const TOOLS = tools(t);

  return (
    <div className="select-toolbar">
      <div className="select-toolbar__section-title">{t("selectToolbar.sectionTitle")}</div>

      {/* docs/specs/26-edit-mode-multi-select.md Granularity Switch — a literal
          track+knob switch (18-design-system.md §Labeled slide switch), not the
          Segmented mode switcher pattern (that reads as tabs; the user explicitly
          asked for a switch). */}
      <GranularitySwitch
        store={store}
        granularity={state.selectGranularity}
        label={(g) => t(`selectToolbar.granularity.${g === "path" ? "pinPath" : "pins"}`)}
      />

      <div className="select-toolbar__grid">
        {TOOLS.map((tool) => {
          const disabled = tool.requiresSelection && !hasSelection;
          return (
            <button
              key={tool.id}
              className={`btn select-toolbar__tool${state.selectTool === tool.id ? " btn-active" : ""}`}
              disabled={disabled}
              onClick={() => store.setSelectTool(tool.id)}
              aria-label={tool.label}
              data-tooltip-id={SELECT_TOOLBAR_TOOLTIP_ID}
              data-tooltip-content={tool.tooltip}
            >
              <tool.icon size={16} />
              {tool.label} [{SELECT_TOOL_SHORTCUT_KEY[tool.id]}]
            </button>
          );
        })}
      </div>

      {/* docs/specs/26-edit-mode-multi-select.md — Merge is an instant action fired
          against the current selection, not a toggleable tool: a full-width action
          button (Primary/Secondary button vocabulary), not a Tool Grid Button. */}
      <button
        className="btn select-toolbar__merge-btn"
        disabled={!canMerge}
        onClick={() => store.commitSelectionMerge()}
        aria-label={t("selectToolbar.tools.merge.label")}
        data-tooltip-id={SELECT_TOOLBAR_TOOLTIP_ID}
        data-tooltip-content={t("selectToolbar.tools.merge.tooltip")}
      >
        <GitMerge size={14} />
        {t("selectToolbar.tools.merge.label")} [J]
      </button>

      <Tooltip id={SELECT_TOOLBAR_TOOLTIP_ID} place="top" />
    </div>
  );
}
