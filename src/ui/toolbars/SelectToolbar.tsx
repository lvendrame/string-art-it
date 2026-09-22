import { GitMerge, MousePointer2, Move, RotateCw, Scaling } from "lucide-react";
import { Tooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";
import type { ComponentType } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { canCommitSelectionMerge, type EditorStore, type SelectGranularity, type SelectTool } from "../../application/document";
import { useEditorState } from "../useEditorStore";
import { SELECT_TOOL_SHORTCUT_KEY } from "./selectToolShortcuts";

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
const TRACK_WIDTH = 40;
const KNOB_SIZE = 14;
const KNOB_INSET = 3;
const KNOB_ON_LEFT = TRACK_WIDTH - KNOB_SIZE - KNOB_INSET;

function GranularitySwitch({ store, granularity, label }: { store: EditorStore; granularity: SelectGranularity; label: (g: SelectGranularity) => string }) {
  const isPins = granularity === "pins";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button
        onClick={() => store.setSelectGranularity("path")}
        style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 12, fontWeight: 600, color: isPins ? "var(--text-secondary)" : "var(--accent)", transition: "color 120ms ease" }}
      >
        {label("path")}
      </button>
      <button
        role="switch"
        aria-checked={isPins}
        aria-label={label("path") + " / " + label("pins") + " [Shift+P]"}
        onClick={() => store.setSelectGranularity(isPins ? "path" : "pins")}
        style={{ position: "relative", width: 44, height: 32, background: "none", border: "none", padding: 0, cursor: "pointer", flexShrink: 0 }}
      >
        <span
          aria-hidden
          style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: TRACK_WIDTH, height: 20, borderRadius: 999, border: "1px solid var(--border)", background: "var(--bg-app)" }}
        />
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: "50%",
            left: (44 - TRACK_WIDTH) / 2 + (isPins ? KNOB_ON_LEFT : KNOB_INSET),
            width: KNOB_SIZE,
            height: KNOB_SIZE,
            borderRadius: "50%",
            background: "var(--accent)",
            transform: "translateY(-50%)",
            transition: "left 150ms ease",
          }}
        />
      </button>
      <button
        onClick={() => store.setSelectGranularity("pins")}
        style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 12, fontWeight: 600, color: isPins ? "var(--accent)" : "var(--text-secondary)", transition: "color 120ms ease" }}
      >
        {label("pins")}
      </button>
    </div>
  );
}

// docs/specs/09-selection-and-editing.md, docs/specs/26-edit-mode-multi-select.md —
// the Edit-mode tool area, now preceded by the Pin Path/Pins granularity switch.
export function SelectToolbar({ store }: { store: EditorStore }) {
  const { t } = useTranslation("toolbars");
  const state = useEditorState(store);
  const hasSelection = state.selection.type === "pinPaths" || state.selection.type === "pins";
  const canMerge = canCommitSelectionMerge(state.selection);
  const TOOLS = tools(t);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--text-tertiary)", textTransform: "uppercase" }}>
        {t("selectToolbar.sectionTitle")}
      </div>

      {/* docs/specs/26-edit-mode-multi-select.md Granularity Switch — a literal
          track+knob switch (18-design-system.md §Labeled slide switch), not the
          Segmented mode switcher pattern (that reads as tabs; the user explicitly
          asked for a switch). */}
      <GranularitySwitch
        store={store}
        granularity={state.selectGranularity}
        label={(g) => t(`selectToolbar.granularity.${g === "path" ? "pinPath" : "pins"}`)}
      />

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
              {tool.label} [{SELECT_TOOL_SHORTCUT_KEY[tool.id]}]
            </button>
          );
        })}
      </div>

      {/* docs/specs/26-edit-mode-multi-select.md — Merge is an instant action fired
          against the current selection, not a toggleable tool: a full-width action
          button (Primary/Secondary button vocabulary), not a Tool Grid Button. */}
      <button
        className="btn"
        disabled={!canMerge}
        onClick={() => store.commitSelectionMerge()}
        aria-label={t("selectToolbar.tools.merge.label")}
        data-tooltip-id={SELECT_TOOLBAR_TOOLTIP_ID}
        data-tooltip-content={t("selectToolbar.tools.merge.tooltip")}
        style={{ justifyContent: "center", borderRadius: "var(--radius-sm)", padding: 9, gap: 6, fontSize: 12, fontWeight: 600 }}
      >
        <GitMerge size={14} />
        {t("selectToolbar.tools.merge.label")} [J]
      </button>

      <Tooltip id={SELECT_TOOLBAR_TOOLTIP_ID} place="top" />
    </div>
  );
}
