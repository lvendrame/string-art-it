import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { useTranslation } from "react-i18next";
import { BarChart3, HelpCircle, Printer, Redo2, Undo2 } from "lucide-react";
import { totalThreadFrames, type EditorStore } from "../application/document";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Canvas } from "./canvas/Canvas";
import { PlaybackCanvas } from "./canvas/PlaybackCanvas";
import { RadialContextMenu, type RadialMenuPosition } from "./canvas/radialMenu/RadialContextMenu";
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
  const { t } = useTranslation("editorShell");
  const state = useEditorState(store);
  const [overlay, setOverlay] = useState<"none" | "print" | "stats" | "help">("none");
  const totalFrames = totalThreadFrames(state.threadLayers);
  const transport = usePlaybackTransport(totalFrames, state.mode === "play");
  const playSvgRef = useRef<SVGSVGElement>(null);
  const videoExport = useVideoExport(playSvgRef, state.board, totalFrames, transport.intervalMs, transport.goToFrame);
  const canvasAreaRef = useRef<HTMLDivElement>(null);
  const [radialMenuPosition, setRadialMenuPosition] = useState<RadialMenuPosition | null>(null);

  // "Adjusting state when a prop changes" (react.dev), same technique as
  // usePlaybackTransport.ts's prevTotalFrames/prevActive: a mode switch invalidates
  // whichever slice set the open menu was showing, so close it in the SAME render
  // rather than via a setState-in-effect (which would cascade an extra render).
  const [prevMode, setPrevMode] = useState(state.mode);
  if (state.mode !== prevMode) {
    setPrevMode(state.mode);
    setRadialMenuPosition(null);
  }

  // docs/specs/25-radial-context-menu.md — right-click anywhere on the canvas area
  // (the interactive Canvas in every mode but Play, PlaybackCanvas in Play mode)
  // opens the radial menu instead of the browser's own context menu. Mounted here,
  // not inside Canvas.tsx, since it must cover both canvas components identically.
  function handleCanvasAreaContextMenu(e: ReactMouseEvent<HTMLDivElement>) {
    e.preventDefault();
    const wrapperRect = canvasAreaRef.current?.getBoundingClientRect();
    if (!wrapperRect) return;
    // The zoom-anchor point (Pan mode's Zoom In/Out) must be in the interactive
    // Canvas svg's own pixel space, same as CanvasToolbar's zoom buttons use — not
    // the outer wrapper's, which may letterbox around the fixed-size svg.
    const svgRect = (e.target as Element).closest("svg")?.getBoundingClientRect() ?? wrapperRect;
    setRadialMenuPosition({
      x: e.clientX - wrapperRect.left,
      y: e.clientY - wrapperRect.top,
      anchorPoint: { x: e.clientX - svgRect.left, y: e.clientY - svgRect.top },
    });
  }

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
          {t("undo")}
        </button>
        <button className="btn" disabled={!store.canRedo()} onClick={() => store.redo()} style={{ borderRadius: 8, padding: 8, background: "transparent", borderColor: "transparent", gap: 6 }}>
          <Redo2 size={14} />
          {t("redo")}
        </button>
        <button className="btn" onClick={() => setOverlay("stats")} style={{ borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 600, gap: 6 }}>
          <BarChart3 size={14} />
          {t("stats")}
        </button>
        <button className="btn" onClick={() => setOverlay("help")} style={{ borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 600, gap: 6 }}>
          <HelpCircle size={14} />
          {t("help")}
        </button>
        <button className="btn" onClick={() => setOverlay("print")} style={{ borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 600, gap: 6 }}>
          <Printer size={14} />
          {t("print")}
        </button>
        <LanguageSwitcher />
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
        <div ref={canvasAreaRef} style={{ flex: 1, minWidth: 0, display: "flex", position: "relative" }} onContextMenu={handleCanvasAreaContextMenu}>
          {state.mode === "play" ? <PlaybackCanvas ref={playSvgRef} state={state} frame={transport.frame} /> : <Canvas store={store} />}
          {radialMenuPosition && (
            <RadialContextMenu
              store={store}
              state={state}
              transport={transport}
              position={radialMenuPosition}
              onClose={() => setRadialMenuPosition(null)}
            />
          )}
        </div>
        <div style={{ width: 260, flex: "0 0 auto", background: "var(--bg-panel)", borderLeft: "1px solid var(--border)" }}>
          <LayersPanel store={store} />
        </div>
      </div>
    </div>
  );
}
