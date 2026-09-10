import { useEffect, useState } from "react";
import { projectFileToDocument, type EditorStore, type ProjectFile } from "../application/document";
import { clearAutosave, loadAutosave, saveAutosave } from "../infrastructure/persistence/autosave";

const DEBOUNCE_MS = 2000;

// docs/specs §00 Phase 2 "autosave" — debounced save on every document mutation, plus
// a restore offer for whatever was found on mount.
export function useAutosave(store: EditorStore) {
  const [pending, setPending] = useState<ProjectFile | null>(() => loadAutosave());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = store.subscribe(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => saveAutosave(store.toProjectFile()), DEBOUNCE_MS);
    });
    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, [store]);

  function restore() {
    if (!pending) return;
    store.loadProject(projectFileToDocument(pending));
    setPending(null);
  }

  function discard() {
    clearAutosave();
    setPending(null);
  }

  return { pendingAutosave: pending, restore, discard };
}
