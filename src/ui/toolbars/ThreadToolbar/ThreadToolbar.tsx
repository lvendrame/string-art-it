import { Croissant, Eraser, MousePointer2, PenLine, Scissors, Waypoints } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { EditorStore } from "../../../application/document";
import { useEditorState } from "../../useEditorStore";
import { PinStateLegend } from "./PinStateLegend";
import "./ThreadToolbar.css";

// docs/specs/24-thread-mode, docs/specs/27-thread-select-tool.md — just the tool
// selector + the pin-highlight-state legend. Colour/width/twist-pitch fields live in
// ThreadPropertiesPanel.tsx (dual-context: selected Thread Path or drawing defaults),
// same split as Pin mode's PinToolbar (tools only) vs PinPropertiesPanel (fields) —
// keeping both here duplicated the fields once a thread could be selected too.
export function ThreadToolbar({ store }: { store: EditorStore }) {
  const { t } = useTranslation("toolbars");
  const state = useEditorState(store);

  return (
    <div className="thread-toolbar">
      <div className="thread-toolbar__section-title">{t("threadToolbar.sectionTitle")}</div>
      <div className="thread-toolbar__tools">
        <button
          className={`btn thread-toolbar__tool${state.threadTool === "draw" ? " btn-active" : ""}`}
          onClick={() => store.setThreadTool("draw")}
        >
          <PenLine size={14} />
          {t("threadToolbar.draw")} [D]
        </button>
        <button
          className={`btn thread-toolbar__tool${state.threadTool === "zigzag" ? " btn-active" : ""}`}
          onClick={() => store.setThreadTool("zigzag")}
        >
          <Waypoints size={14} />
          {t("threadToolbar.zigzag")} [Z]
        </button>
        <button
          className={`btn thread-toolbar__tool${state.threadTool === "parabolic" ? " btn-active" : ""}`}
          onClick={() => store.setThreadTool("parabolic")}
        >
          <Croissant size={14} />
          {t("threadToolbar.parabolic")} [P]
        </button>
        <button
          className={`btn thread-toolbar__tool${state.threadTool === "select" ? " btn-active" : ""}`}
          onClick={() => store.setThreadTool("select")}
        >
          <MousePointer2 size={14} />
          {t("threadToolbar.select")} [S]
        </button>
        <button
          className={`btn thread-toolbar__tool${state.threadTool === "eraser" ? " btn-active" : ""}`}
          onClick={() => store.setThreadTool("eraser")}
        >
          <Eraser size={14} />
          {t("threadToolbar.eraser")} [E]
        </button>
        <button
          className={`btn thread-toolbar__tool${state.threadTool === "segment-eraser" ? " btn-active" : ""}`}
          onClick={() => store.setThreadTool("segment-eraser")}
        >
          <Scissors size={14} />
          {t("threadToolbar.segment")} [C]
        </button>
      </div>

      <div className="thread-toolbar__legend">
        <PinStateLegend swatch={<span className="thread-toolbar__swatch-dot thread-toolbar__swatch-dot--normal" />} label={t("threadToolbar.legend.normal")} />
        <PinStateLegend
          swatch={
            <span className="thread-toolbar__swatch-candidate">
              <span className="thread-toolbar__swatch-candidate-ring" />
              <span className="thread-toolbar__swatch-candidate-dot" />
            </span>
          }
          label={t("threadToolbar.legend.nearestCandidate")}
        />
        <PinStateLegend swatch={<span className="thread-toolbar__swatch-dot thread-toolbar__swatch-dot--active" />} label={t("threadToolbar.legend.activeOrigin")} />
        <PinStateLegend swatch={<span className="thread-toolbar__swatch-dot thread-toolbar__swatch-dot--used" />} label={t("threadToolbar.legend.usedInThisThread")} />
      </div>
    </div>
  );
}
