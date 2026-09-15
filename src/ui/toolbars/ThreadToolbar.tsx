import { Eraser, MousePointer2, PenLine, Scissors } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { EditorStore } from "../../application/document";
import { useEditorState } from "../useEditorStore";

// docs/specs/24-thread-mode, docs/specs/27-thread-select-tool.md — just the tool
// selector + the pin-highlight-state legend. Colour/width/twist-pitch fields live in
// ThreadPropertiesPanel.tsx (dual-context: selected Thread Path or drawing defaults),
// same split as Pin mode's PinToolbar (tools only) vs PinPropertiesPanel (fields) —
// keeping both here duplicated the fields once a thread could be selected too.
export function ThreadToolbar({ store }: { store: EditorStore }) {
  const { t } = useTranslation("toolbars");
  const state = useEditorState(store);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--text-tertiary)", textTransform: "uppercase" }}>
        {t("threadToolbar.sectionTitle")}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button className={`btn${state.threadTool === "draw" ? " btn-active" : ""}`} onClick={() => store.setThreadTool("draw")} style={{ flex: 1, justifyContent: "center", borderRadius: "var(--radius-sm)", padding: 9, fontSize: 12, fontWeight: 600, gap: 6 }}>
          <PenLine size={14} />
          {t("threadToolbar.draw")}
        </button>
        <button className={`btn${state.threadTool === "select" ? " btn-active" : ""}`} onClick={() => store.setThreadTool("select")} style={{ flex: 1, justifyContent: "center", borderRadius: "var(--radius-sm)", padding: 9, fontSize: 12, fontWeight: 600, gap: 6 }}>
          <MousePointer2 size={14} />
          {t("threadToolbar.select")}
        </button>
        <button className={`btn${state.threadTool === "eraser" ? " btn-active" : ""}`} onClick={() => store.setThreadTool("eraser")} style={{ flex: 1, justifyContent: "center", borderRadius: "var(--radius-sm)", padding: 9, fontSize: 12, fontWeight: 600, gap: 6 }}>
          <Eraser size={14} />
          {t("threadToolbar.eraser")}
        </button>
        <button className={`btn${state.threadTool === "segment-eraser" ? " btn-active" : ""}`} onClick={() => store.setThreadTool("segment-eraser")} style={{ flex: 1, justifyContent: "center", borderRadius: "var(--radius-sm)", padding: 9, fontSize: 12, fontWeight: 600, gap: 6 }}>
          <Scissors size={14} />
          {t("threadToolbar.segment")}
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, background: "var(--bg-app)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "10px 12px", marginTop: 4 }}>
        <PinStateLegend swatch={<span style={{ width: 10, height: 10, borderRadius: "50%", background: "#c7cad3", display: "inline-block" }} />} label={t("threadToolbar.legend.normal")} />
        <PinStateLegend
          swatch={
            <span style={{ position: "relative", width: 14, height: 14, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "1.5px solid #e8b449" }} />
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#e8b449" }} />
            </span>
          }
          label={t("threadToolbar.legend.nearestCandidate")}
        />
        <PinStateLegend swatch={<span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--accent)", display: "inline-block" }} />} label={t("threadToolbar.legend.activeOrigin")} />
        <PinStateLegend swatch={<span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--accent)", opacity: 0.5, display: "inline-block" }} />} label={t("threadToolbar.legend.usedInThisThread")} />
      </div>
    </div>
  );
}

function PinStateLegend({ swatch, label }: { swatch: React.ReactNode; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
      {swatch}
      <span style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>{label}</span>
    </div>
  );
}
