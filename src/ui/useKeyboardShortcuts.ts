import { useEffect, type RefObject } from "react";
import {
  createEmptyProject,
  SYMMETRY_TYPE_CYCLE,
  symmetryConfigForType,
  type EditorMode,
  type EditorState,
  type EditorStore,
} from "@application/document";
import { fitViewportForBoard } from "./canvas/boardViewport";
import { zoomInStep, zoomOutStep } from "./canvas/zoomSteps";
import { getCanvasViewportCenter } from "./canvas/canvasViewportSize";
import { isTextEntryTarget } from "./keyboard";
import type { FileMenuHandle } from "./toolbars/FileMenu";
import { saveProjectFile } from "./toolbars/projectFileDownload";
import { coloursForCount } from "./panels/threadColourPalette";
import type { PlaybackTransport } from "./toolbars/usePlaybackTransport";

// docs/specs/34-keyboard-shortcuts.md — the six mode tabs in ModeSwitcher.tsx's own
// display order, which the bare-digit shortcuts (1-6) index into.
const MODE_ORDER: EditorMode[] = ["select", "pin", "thread", "generate", "pan", "play"];

interface VideoExportState {
  isExporting: boolean;
  supported: boolean;
  exportVideo: () => Promise<void>;
}

export interface KeyboardShortcutDeps {
  transport: PlaybackTransport;
  totalFrames: number;
  videoExport: VideoExportState;
  onNewProject: () => void;
  openHelp: () => void;
  fileMenuRef: RefObject<FileMenuHandle | null>;
}

// docs/specs/34-keyboard-shortcuts.md — the single central dispatcher for every
// app-wide/per-tab shortcut (~40 bindings). Mounted once in EditorShell, additive only:
// it never binds Escape/ArrowLeft/ArrowRight/Ctrl+Z, so it can't collide with the
// existing scattered listeners (EditorShell's own undo/redo effect,
// useKeyboardTransform, useThreadDrawing, usePolygonDrawing,
// useTwoPinSequenceDrawing). Re-reads
// store.getState() on every keystroke rather than closing over stale state, same
// pattern useKeyboardTransform already uses.
//
// Dispatch order is mode-specific branch first, global branch last, so a key bound
// both mode-specifically and globally (the bare "+"/"-" vs Thread's Shift+"+"/"-")
// resolves to the mode-specific meaning while that mode is active — see the spec's
// "Design decisions" section for why Shift can't be independently distinguished from
// the character produced on standard keyboard layouts.
export function useKeyboardShortcuts(store: EditorStore, deps: KeyboardShortcutDeps): void {
  useEffect(() => {
    function handlePlay(e: KeyboardEvent): boolean {
      const disabled = deps.videoExport.isExporting || deps.totalFrames === 0;
      if (disabled) return false;
      const key = e.key.toLowerCase();
      if (!e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (key === "f") {
          deps.transport.first();
          return true;
        }
        if (key === "p") {
          deps.transport.previous();
          return true;
        }
        if (key === "n") {
          deps.transport.next();
          return true;
        }
        if (key === "l") {
          deps.transport.last();
          return true;
        }
        if (e.key === " ") {
          if (deps.transport.isPlaying) deps.transport.pause();
          else deps.transport.play();
          return true;
        }
      }
      if (e.shiftKey && key === "e" && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (deps.videoExport.supported) void deps.videoExport.exportVideo();
        return true;
      }
      return false;
    }

    function handleThread(e: KeyboardEvent): boolean {
      const key = e.key.toLowerCase();
      const bare = !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey;
      if (bare) {
        const tool = { d: "draw", s: "select", e: "eraser", c: "segment-eraser", z: "zigzag", p: "parabolic" } as const;
        if (key in tool) {
          store.setThreadTool(tool[key as keyof typeof tool]);
          return true;
        }
      }
      if (e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // e.key is layout/shift-dependent — Shift+2 produces "@" on a real US
        // keyboard, never "2", so digit detection must use the physical key (e.code)
        // instead of the character it types.
        const digitMatch = /^Digit([1-3])$/.exec(e.code);
        if (digitMatch) {
          const state = store.getState();
          const selected = store.getSelectedThreadPath();
          const colours = selected ? selected.colours : state.threadDefaults.colours;
          store.setThreadProperty({ colours: coloursForCount(colours, Number(digitMatch[1])) });
          return true;
        }
        if (e.key === "+" || e.key === "=") {
          const state = store.getState();
          const selected = store.getSelectedThreadPath();
          const width = selected ? selected.width : state.threadDefaults.width;
          store.setThreadProperty({ width: Math.min(5, width + 0.5) });
          return true;
        }
        if (e.key === "_" || e.key === "-") {
          const state = store.getState();
          const selected = store.getSelectedThreadPath();
          const width = selected ? selected.width : state.threadDefaults.width;
          store.setThreadProperty({ width: Math.max(0.5, width - 0.5) });
          return true;
        }
      }
      return false;
    }

    function handlePin(e: KeyboardEvent): boolean {
      const key = e.key.toLowerCase();
      if (e.shiftKey && key === "s" && !e.ctrlKey && !e.altKey && !e.metaKey) {
        const state = store.getState();
        const selected = store.getSelectedPinPath();
        const current = (selected ? selected.symmetry : state.symmetryDefaults).type;
        const next = SYMMETRY_TYPE_CYCLE[(SYMMETRY_TYPE_CYCLE.indexOf(current) + 1) % SYMMETRY_TYPE_CYCLE.length];
        store.setSymmetryConfig(symmetryConfigForType(next));
        return true;
      }
      if (!e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
        const tool = {
          l: "line",
          a: "arc",
          e: "ellipse",
          c: "circle",
          r: "rectangle",
          s: "square",
          f: "freehand",
          p: "polygon",
          t: "text",
          d: "eraser",
          q: "path-eraser",
        } as const;
        if (key in tool) {
          store.setPinTool(tool[key as keyof typeof tool]);
          return true;
        }
      }
      return false;
    }

    function handleEdit(e: KeyboardEvent): boolean {
      const key = e.key.toLowerCase();
      if (e.shiftKey && key === "p" && !e.ctrlKey && !e.altKey && !e.metaKey) {
        const state = store.getState();
        store.setSelectGranularity(state.selectGranularity === "path" ? "pins" : "path");
        return true;
      }
      if (!e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
        const tool = { s: "select", m: "move", r: "rotate", c: "scale" } as const;
        if (key in tool) {
          store.setSelectTool(tool[key as keyof typeof tool]);
          return true;
        }
        if (key === "j") {
          const state = store.getState();
          if (state.selection.type === "pinPaths" || state.selection.type === "pins") {
            if (state.selection.refs.length >= 2) store.commitSelectionMerge();
          }
          return true;
        }
      }
      return false;
    }

    // docs/specs/34-keyboard-shortcuts.md — arrow-key pan is the fallback for whenever
    // no other arrow-key consumer is claiming the key: Edit mode's Move/Rotation/Scale
    // nudge (useKeyboardTransform.ts, all 4 arrows, gated on the ACTIVE TOOL rather than
    // a live selection — so arrows stay silent, not pan, if e.g. Move is picked but
    // nothing is selected yet, matching "a selected tool that uses the arrow keys"),
    // an in-progress Thread Draw draft (useThreadDrawing.ts, ArrowLeft retract /
    // ArrowRight pattern-follow), an in-progress Path tool draft (usePolygonDrawing.ts,
    // ArrowLeft retract), and an in-progress Zig-zag/Parabolic draft
    // (useTwoPinSequenceDrawing.ts, ArrowLeft retract). Those hooks are independent
    // `window` keydown listeners that also fire on this same event — re-deriving their
    // "would I act" predicate here (rather than a shared preventDefault flag) is what
    // keeps this purely additive without touching those files.
    function isArrowClaimedElsewhere(state: EditorState, key: string): boolean {
      if (state.mode === "select" && (state.selectTool === "move" || state.selectTool === "rotate" || state.selectTool === "scale")) {
        return true;
      }
      if (state.mode === "thread" && state.threadDraft && (key === "ArrowLeft" || key === "ArrowRight")) {
        return true;
      }
      if (state.mode === "pin" && state.pinTool === "polygon" && state.polygonDraft && key === "ArrowLeft") {
        return true;
      }
      if (state.mode === "thread" && state.twoPinDraft && key === "ArrowLeft") {
        return true;
      }
      return false;
    }

    function handleArrowPan(e: KeyboardEvent): boolean {
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown" && e.key !== "ArrowLeft" && e.key !== "ArrowRight") return false;
      if (e.ctrlKey || e.metaKey || e.altKey) return false;
      const state = store.getState();
      if (isArrowClaimedElsewhere(state, e.key)) return false;

      // Signed to match usePanInteraction.ts's drag-to-pan convention exactly (content
      // follows the gesture): dragging/pressing right moves the board right (panOrigin.x
      // decreases, same as that hook's `origin.x - dx/zoom` with a positive drag dx).
      const stepPx = e.shiftKey ? 100 : 20;
      const dx = e.key === "ArrowLeft" ? stepPx : e.key === "ArrowRight" ? -stepPx : 0;
      const dy = e.key === "ArrowUp" ? stepPx : e.key === "ArrowDown" ? -stepPx : 0;
      const { viewport } = state;
      store.setViewport({
        ...viewport,
        panOrigin: { x: viewport.panOrigin.x + dx / viewport.zoom, y: viewport.panOrigin.y + dy / viewport.zoom },
      });
      return true;
    }

    function handleGlobal(e: KeyboardEvent): void {
      const primary = e.ctrlKey || e.metaKey;

      if (handleArrowPan(e)) {
        e.preventDefault();
        return;
      }

      if (primary && e.altKey && !e.shiftKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        store.loadProject(createEmptyProject());
        deps.onNewProject();
        return;
      }
      if (primary && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveProjectFile(store);
        return;
      }
      if (primary && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "o") {
        e.preventDefault();
        deps.fileMenuRef.current?.openFilePicker();
        return;
      }
      if (!primary && !e.altKey && e.key === "?") {
        e.preventDefault();
        deps.openHelp();
        return;
      }
      if (primary && e.shiftKey && !e.altKey && e.key.toLowerCase() === "g") {
        e.preventDefault();
        const state = store.getState();
        store.setGrid({ visible: !state.grid.visible });
        return;
      }
      if (primary && e.shiftKey && !e.altKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        const state = store.getState();
        store.setGrid({ snapEnabled: !state.grid.snapEnabled });
        return;
      }
      if (!primary && !e.altKey && (e.key === "+" || e.key === "=")) {
        e.preventDefault();
        const state = store.getState();
        store.setViewport(zoomInStep(state.viewport, getCanvasViewportCenter()));
        return;
      }
      if (!primary && !e.altKey && (e.key === "-" || e.key === "_")) {
        e.preventDefault();
        const state = store.getState();
        store.setViewport(zoomOutStep(state.viewport, getCanvasViewportCenter()));
        return;
      }
      if (!primary && !e.altKey && !e.shiftKey && e.key === "0") {
        e.preventDefault();
        const state = store.getState();
        store.setViewport(fitViewportForBoard(state.board));
        return;
      }
      if (!primary && !e.altKey && !e.shiftKey && e.key >= "1" && e.key <= "6") {
        e.preventDefault();
        store.setMode(MODE_ORDER[Number(e.key) - 1]);
        return;
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (isTextEntryTarget(e.target)) return;
      const mode = store.getState().mode;
      let handled = false;
      if (mode === "play") handled = handlePlay(e);
      else if (mode === "thread") handled = handleThread(e);
      else if (mode === "pin") handled = handlePin(e);
      else if (mode === "select") handled = handleEdit(e);
      if (handled) {
        e.preventDefault();
        return;
      }
      handleGlobal(e);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, deps.transport, deps.totalFrames, deps.videoExport, deps.onNewProject, deps.openHelp, deps.fileMenuRef]);
}
