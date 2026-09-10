import { useEffect, useState } from "react";
import type { EditorStore } from "../application/document";
import { Canvas } from "./canvas/Canvas";
import { ModeSwitcher } from "./toolbars/ModeSwitcher";
import { FileMenu } from "./toolbars/FileMenu";
import { ExportMenu } from "./toolbars/ExportMenu";
import { PinToolbar } from "./toolbars/PinToolbar";
import { ThreadToolbar } from "./toolbars/ThreadToolbar";
import { PinPropertiesPanel } from "./panels/PinPropertiesPanel";
import { SelectionPanel } from "./panels/SelectionPanel";
import { SymmetryPanel } from "./panels/SymmetryPanel";
import { LayersPanel } from "./panels/LayersPanel";
import { PrintPreviewPanel } from "./panels/PrintPreviewPanel";
import { StatisticsPanel } from "./panels/StatisticsPanel";
import { useEditorState } from "./useEditorStore";

function isTextEntryTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
}

export function EditorShell({ store }: { store: EditorStore }) {
  const state = useEditorState(store);
  const [overlay, setOverlay] = useState<"none" | "print" | "stats">("none");

  // docs/specs/10-undo-redo.md — Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z, except while a text
  // field has focus (renaming a layer, a numeric input) so the browser's own text-undo
  // isn't hijacked.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "z") return;
      if (isTextEntryTarget(e.target)) return;
      e.preventDefault();
      if (e.shiftKey) store.redo();
      else store.undo();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [store]);

  return (
    <div style={{ width: "100%", height: "100vh", display: "flex", flexDirection: "column", background: "var(--bg-app)" }}>
      <div style={{ height: 56, flex: "0 0 auto", display: "flex", alignItems: "center", gap: 20, padding: "0 16px", background: "var(--bg-panel)", borderBottom: "1px solid var(--border)" }}>
        <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: "-0.01em" }}>StringArtIt</span>
        <FileMenu store={store} />
        <ExportMenu store={store} />
        <div style={{ flex: 1 }} />
        <ModeSwitcher mode={state.mode} onChange={store.setMode.bind(store)} />
        <div style={{ flex: 1 }} />
        <button className="btn" disabled={!store.canUndo()} onClick={() => store.undo()} style={{ borderRadius: 8, padding: 8, background: "transparent", borderColor: "transparent" }}>
          Undo
        </button>
        <button className="btn" disabled={!store.canRedo()} onClick={() => store.redo()} style={{ borderRadius: 8, padding: 8, background: "transparent", borderColor: "transparent" }}>
          Redo
        </button>
        <button className="btn" onClick={() => setOverlay("stats")} style={{ borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 600 }}>
          Stats
        </button>
        <button className="btn" onClick={() => setOverlay("print")} style={{ borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 600 }}>
          Print
        </button>
      </div>

      <div style={{ flex: 1, display: "flex", minHeight: 0, position: "relative" }}>
        {overlay === "print" && <PrintPreviewPanel store={store} onClose={() => setOverlay("none")} />}
        {overlay === "stats" && <StatisticsPanel store={store} onClose={() => setOverlay("none")} />}
        {state.mode === "pin" && (
          <div style={{ width: 248, flex: "0 0 auto", background: "var(--bg-panel)", borderRight: "1px solid var(--border)", overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 20 }}>
            <PinToolbar store={store} />
            <PinPropertiesPanel store={store} />
            <SymmetryPanel store={store} />
          </div>
        )}
        {state.mode === "select" && (
          <div style={{ width: 248, flex: "0 0 auto", background: "var(--bg-panel)", borderRight: "1px solid var(--border)", overflowY: "auto" }}>
            <SelectionPanel store={store} />
          </div>
        )}
        {state.mode === "thread" && (
          <div style={{ width: 248, flex: "0 0 auto", background: "var(--bg-panel)", borderRight: "1px solid var(--border)", overflowY: "auto", padding: 16 }}>
            <ThreadToolbar store={store} />
          </div>
        )}
        <Canvas store={store} />
        <div style={{ width: 260, flex: "0 0 auto", background: "var(--bg-panel)", borderLeft: "1px solid var(--border)" }}>
          <LayersPanel store={store} />
        </div>
      </div>
    </div>
  );
}
