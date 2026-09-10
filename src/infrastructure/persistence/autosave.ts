import { migrateProjectFile, type ProjectFile } from "../../application/document";

// docs/specs §00 Phase 2 "autosave" — real browser storage I/O, so this stays in
// infrastructure/ (docs/specs/01-architecture.md) rather than application/document,
// which only ever produces/consumes plain ProjectFile data.
const AUTOSAVE_KEY = "stringartit:autosave:v1";

export function saveAutosave(file: ProjectFile): void {
  try {
    window.localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(file));
  } catch {
    // Storage can be unavailable (private browsing, quota) — autosave is best-effort,
    // never something a save/draw action should fail loudly over.
  }
}

export function loadAutosave(): ProjectFile | null {
  try {
    const raw = window.localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return null;
    return migrateProjectFile(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function clearAutosave(): void {
  try {
    window.localStorage.removeItem(AUTOSAVE_KEY);
  } catch {
    // ignore
  }
}
