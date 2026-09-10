import { useSyncExternalStore } from "react";
import type { EditorStore } from "../application/document";

// Thin React adapter over the framework-free EditorStore (docs/specs/01-architecture.md
// — ui/ may depend on application/, never the reverse).
export function useEditorState(store: EditorStore) {
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}
