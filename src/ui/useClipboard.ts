import { useEffect } from "react";
import { parseClipboard, serializeClipboard, type EditorStore } from "@application/document";
import { isTextEntryTarget } from "./keyboard";

const CLIPBOARD_MIME = "text/plain";

function hasTextSelection(): boolean {
  return (window.getSelection()?.toString() ?? "").length > 0;
}

function isEditorClipboardEvent(e: ClipboardEvent, store: EditorStore): boolean {
  return !!e.clipboardData && !isTextEntryTarget(e.target) && store.getState().mode !== "play";
}

// docs/specs/39-copy-paste.md — native copy/paste events, not keydown: Cmd+V is
// OS-reserved as a keystroke (docs/specs/34-keyboard-shortcuts.md), and the events
// give synchronous, permission-free access to the system clipboard.
export function useClipboard(store: EditorStore): void {
  useEffect(() => {
    function onCopy(e: ClipboardEvent) {
      if (!isEditorClipboardEvent(e, store) || hasTextSelection()) return;
      const payload = store.copySelection();
      if (!payload) return;
      e.clipboardData!.setData(CLIPBOARD_MIME, serializeClipboard(payload));
      e.preventDefault();
    }

    function onPaste(e: ClipboardEvent) {
      if (!isEditorClipboardEvent(e, store)) return;
      const payload = parseClipboard(e.clipboardData!.getData(CLIPBOARD_MIME));
      if (!payload) return;
      e.preventDefault();
      store.pasteClipboard(payload);
    }

    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);
    return () => {
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
    };
  }, [store]);
}
