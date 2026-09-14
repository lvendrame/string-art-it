import { useEffect, useRef, useState } from "react";
import { BarChart3, HelpCircle, Printer, Redo2, Undo2 } from "lucide-react";
import { totalThreadFrames, type EditorStore } from "../application/document";
import { Canvas } from "./canvas/Canvas";
import { PlaybackCanvas } from "./canvas/PlaybackCanvas";
import { ModeSwitcher } from "./toolbars/ModeSwitcher";
import { FileMenu } from "./toolbars/FileMenu";
import { ExportMenu } from "./toolbars/ExportMenu";
import { PinToolbar } from "./toolbars/PinToolbar";
import { ThreadToolbar } from "./toolbars/ThreadToolbar";
import { SelectToolbar } from "./toolbars/SelectToolbar";
import { PlayToolbar } from "./toolbars/PlayToolbar";
import { usePlaybackTransport } from "./toolbars/usePlaybackTransport";
import { useVideoExport } from "./toolbars/useVideoExport";
import { PinPropertiesPanel } from "./panels/PinPropertiesPanel";
import { SelectionPanel } from "./panels/SelectionPanel";
import { SymmetryPanel } from "./panels/SymmetryPanel";
import { LayersPanel } from "./panels/LayersPanel";
import { PrintPreviewPanel } from "./panels/PrintPreviewPanel";
import { StatisticsPanel } from "./panels/StatisticsPanel";
import { HelpPanel } from "./panels/help/HelpPanel";
import { useEditorState } from "./useEditorStore";
import { isTextEntryTarget } from "./keyboard";

export function EditorShell({ store, onNewProject }: { store: EditorStore; onNewProject: () => void }) {
  const state = useEditorState(store);
  const [overlay, setOverlay] = useState<"none" | "print" | "stats" | "help">("none");
  const totalFrames = totalThreadFrames(state.threadLayers);
  const transport = usePlaybackTransport(totalFrames, state.mode === "play");
  const playSvgRef = useRef<SVGSVGElement>(null);
  const videoExport = useVideoExport(playSvgRef, state.board, totalFrames, transport.intervalMs, transport.goToFrame);

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
        <FileMenu store={store} onNewProject={onNewProject} />
        <ExportMenu store={store} />
        <div style={{ flex: 1 }} />
        <ModeSwitcher mode={state.mode} onChange={store.setMode.bind(store)} />
        <div style={{ flex: 1 }} />
        <button className="btn" disabled={!store.canUndo()} onClick={() => store.undo()} style={{ borderRadius: 8, padding: 8, background: "transparent", borderColor: "transparent", gap: 6 }}>
          <Undo2 size={14} />
          Undo
        </button>
        <button className="btn" disabled={!store.canRedo()} onClick={() => store.redo()} style={{ borderRadius: 8, padding: 8, background: "transparent", borderColor: "transparent", gap: 6 }}>
          <Redo2 size={14} />
          Redo
        </button>
        <button className="btn" onClick={() => setOverlay("stats")} style={{ borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 600, gap: 6 }}>
          <BarChart3 size={14} />
          Stats
        </button>
        <button className="btn" onClick={() => setOverlay("help")} style={{ borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 600, gap: 6 }}>
          <HelpCircle size={14} />
          Help
        </button>
        <button className="btn" onClick={() => setOverlay("print")} style={{ borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 600, gap: 6 }}>
          <Printer size={14} />
          Print
        </button>
      </div>

      <div style={{ flex: 1, display: "flex", minHeight: 0, position: "relative" }}>
        {overlay === "print" && <PrintPreviewPanel store={store} onClose={() => setOverlay("none")} />}
        {overlay === "stats" && <StatisticsPanel store={store} onClose={() => setOverlay("none")} />}
        {overlay === "help" && <HelpPanel currentMode={state.mode} onClose={() => setOverlay("none")} />}
        {state.mode === "pin" && (
          <div style={{ width: 248, flex: "0 0 auto", background: "var(--bg-panel)", borderRight: "1px solid var(--border)", overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 20 }}>
            <PinToolbar store={store} />
            <PinPropertiesPanel store={store} />
            <SymmetryPanel store={store} />
          </div>
        )}
        {state.mode === "select" && (
          <div style={{ width: 248, flex: "0 0 auto", background: "var(--bg-panel)", borderRight: "1px solid var(--border)", overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 20 }}>
            <SelectToolbar store={store} />
            <SelectionPanel store={store} />
          </div>
        )}
        {state.mode === "thread" && (
          <div style={{ width: 248, flex: "0 0 auto", background: "var(--bg-panel)", borderRight: "1px solid var(--border)", overflowY: "auto", padding: 16 }}>
            <ThreadToolbar store={store} />
          </div>
        )}
        {state.mode === "play" && (
          <div style={{ width: 248, flex: "0 0 auto", background: "var(--bg-panel)", borderRight: "1px solid var(--border)", overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 20 }}>
            <PlayToolbar transport={transport} totalFrames={totalFrames} videoExport={videoExport} />
          </div>
        )}
        {state.mode === "play" ? <PlaybackCanvas ref={playSvgRef} state={state} frame={transport.frame} /> : <Canvas store={store} />}
        <div style={{ width: 260, flex: "0 0 auto", background: "var(--bg-panel)", borderLeft: "1px solid var(--border)" }}>
          <LayersPanel store={store} />
        </div>
      </div>
    </div>
  );
}
