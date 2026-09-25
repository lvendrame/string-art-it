import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { useTranslation } from "react-i18next";
import { BarChart3, HelpCircle, Printer, Redo2, Undo2 } from "lucide-react";
import { Tooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";
import { totalThreadFrames, type EditorStore } from "@application/document";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Canvas } from "./canvas/Canvas";
import { PlaybackCanvas } from "./canvas/PlaybackCanvas";
import { RadialContextMenu, type RadialMenuPosition } from "./canvas/radialMenu/RadialContextMenu";
import { ModeSwitcher } from "./toolbars/ModeSwitcher";
import { FileMenu, type FileMenuHandle } from "./toolbars/FileMenu";
import { ExportMenu } from "./toolbars/ExportMenu";
import { PinToolbar } from "./toolbars/PinToolbar";
import { ThreadToolbar } from "./toolbars/ThreadToolbar/ThreadToolbar";
import { SelectToolbar } from "./toolbars/SelectToolbar/SelectToolbar";
import { PlayToolbar } from "./toolbars/PlayToolbar";
import { usePlaybackTransport } from "./toolbars/usePlaybackTransport";
import { useVideoExport } from "./toolbars/useVideoExport";
import { GeneratorPanel } from "./panels/GeneratorPanel/GeneratorPanel";
import { PinPropertiesPanel } from "./panels/PinPropertiesPanel";
import { SelectionPanel } from "./panels/SelectionPanel/SelectionPanel";
import { ThreadPropertiesPanel } from "./panels/ThreadPropertiesPanel/ThreadPropertiesPanel";
import { SymmetryPanel } from "./panels/SymmetryPanel";
import { LayersPanel } from "./panels/LayersPanel/LayersPanel";
import { PrintPreviewPanel } from "./panels/PrintPreviewPanel/PrintPreviewPanel";
import { StatisticsPanel } from "./panels/StatisticsPanel/StatisticsPanel";
import { HelpPanel } from "./panels/help/HelpPanel/HelpPanel";
import { useEditorState } from "./useEditorStore";
import { isTextEntryTarget } from "./keyboard";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";
import "./EditorShell.css";

const EDITOR_SHELL_TOOLTIP_ID = "editor-shell-tooltip";

export function EditorShell({ store, onNewProject }: { store: EditorStore; onNewProject: () => void }) {
  const { t } = useTranslation("editorShell");
  const state = useEditorState(store);
  const [overlay, setOverlay] = useState<"none" | "print" | "stats" | "help">("none");
  const totalFrames = totalThreadFrames(state.threadLayers);
  const transport = usePlaybackTransport(totalFrames, state.mode === "play");
  const playSvgRef = useRef<SVGSVGElement>(null);
  const videoExport = useVideoExport(playSvgRef, state.board, totalFrames, transport.intervalMs, transport.goToFrame);
  const canvasAreaRef = useRef<HTMLDivElement>(null);
  const fileMenuRef = useRef<FileMenuHandle>(null);
  const [radialMenuPosition, setRadialMenuPosition] = useState<RadialMenuPosition | null>(null);
  // The contextmenu event follows mousedown, which may already have switched modes
  // (a pin tool committing on click hands off to Edit mode).
  const modeAtMouseDownRef = useRef(state.mode);

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
    // macOS turns Ctrl+click into a contextmenu; in Pin mode that's the board-centre
    // snap gesture (docs/specs/05-canvas-and-viewport.md), so it must not open the menu.
    if (modeAtMouseDownRef.current === "pin" && e.ctrlKey) return;
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
  // isn't hijacked. While a Thread Path draft is in progress, plain Ctrl/Cmd+Z retracts
  // its last vertex instead (same as ArrowLeft, docs/specs/12-thread-editor.md) since
  // the draft itself isn't in the undo history yet (only committed on finish).
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "z") return;
      if (isTextEntryTarget(e.target)) return;
      e.preventDefault();
      if (e.shiftKey) {
        store.redo();
      } else if (store.getState().threadDraft) {
        store.retractThreadDraft();
      } else {
        store.undo();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [store]);

  // docs/specs/34-keyboard-shortcuts.md — the ~40-binding app-wide/per-tab shortcut
  // table, everything else this milestone adds.
  useKeyboardShortcuts(store, {
    transport,
    totalFrames,
    videoExport,
    onNewProject,
    openHelp: () => setOverlay("help"),
    fileMenuRef,
  });

  return (
    <div className="editor-shell">
      <div className="editor-shell__topbar">
        <span className="editor-shell__logo">StringArtIt</span>
        <FileMenu ref={fileMenuRef} store={store} onNewProject={onNewProject} />
        <ExportMenu store={store} />
        <div className="editor-shell__spacer" />
        <ModeSwitcher mode={state.mode} onChange={store.setMode.bind(store)} />
        <div className="editor-shell__spacer" />
        <button
          className="btn editor-shell__icon-btn"
          disabled={!store.canUndo()}
          onClick={() => store.undo()}
          aria-label={t("undo")}
          data-tooltip-id={EDITOR_SHELL_TOOLTIP_ID}
          data-tooltip-content={t("undo")}
        >
          <Undo2 size={14} />
        </button>
        <button
          className="btn editor-shell__icon-btn"
          disabled={!store.canRedo()}
          onClick={() => store.redo()}
          aria-label={t("redo")}
          data-tooltip-id={EDITOR_SHELL_TOOLTIP_ID}
          data-tooltip-content={t("redo")}
        >
          <Redo2 size={14} />
        </button>
        <button
          className="btn editor-shell__toolbar-btn"
          onClick={() => setOverlay("stats")}
          aria-label={t("stats")}
          data-tooltip-id={EDITOR_SHELL_TOOLTIP_ID}
          data-tooltip-content={t("stats")}
        >
          <BarChart3 size={14} />
        </button>
        <button
          className="btn editor-shell__toolbar-btn"
          onClick={() => setOverlay("help")}
          aria-label={t("help")}
          data-tooltip-id={EDITOR_SHELL_TOOLTIP_ID}
          data-tooltip-content={t("help")}
        >
          <HelpCircle size={14} />
        </button>
        <button
          className="btn editor-shell__toolbar-btn"
          onClick={() => setOverlay("print")}
          aria-label={t("print")}
          data-tooltip-id={EDITOR_SHELL_TOOLTIP_ID}
          data-tooltip-content={t("print")}
        >
          <Printer size={14} />
        </button>
        <LanguageSwitcher />
        <Tooltip id={EDITOR_SHELL_TOOLTIP_ID} place="bottom" />
      </div>

      <div className="editor-shell__body">
        {overlay === "print" && <PrintPreviewPanel store={store} onClose={() => setOverlay("none")} />}
        {overlay === "stats" && <StatisticsPanel store={store} onClose={() => setOverlay("none")} />}
        {overlay === "help" && <HelpPanel currentMode={state.mode} onClose={() => setOverlay("none")} />}
        {state.mode === "pin" && (
          <div className="editor-shell__side-panel">
            <PinToolbar store={store} />
            <PinPropertiesPanel store={store} />
            <SymmetryPanel store={store} />
          </div>
        )}
        {state.mode === "select" && (
          <div className="editor-shell__side-panel">
            <SelectToolbar store={store} />
            <SelectionPanel store={store} />
          </div>
        )}
        {state.mode === "thread" && (
          <div className="editor-shell__side-panel">
            <ThreadToolbar store={store} />
            <ThreadPropertiesPanel store={store} />
          </div>
        )}
        {state.mode === "play" && (
          <div className="editor-shell__side-panel">
            <PlayToolbar transport={transport} totalFrames={totalFrames} videoExport={videoExport} />
          </div>
        )}
        {state.mode === "generate" && (
          <div className="editor-shell__side-panel">
            <GeneratorPanel store={store} />
          </div>
        )}
        <div
          ref={canvasAreaRef}
          className="editor-shell__canvas-area"
          onMouseDownCapture={() => { modeAtMouseDownRef.current = state.mode; }}
          onContextMenu={handleCanvasAreaContextMenu}
        >
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
        <div className="editor-shell__layers-panel">
          <LayersPanel store={store} />
        </div>
      </div>
    </div>
  );
}
