import { useRef } from "react";
import {
  createEmptyProject,
  migrateProjectFile,
  projectFileToDocument,
  type EditorStore,
} from "../../application/document";
import { fitViewportForBoard } from "../canvas/boardViewport";

// docs/specs/16-persistence.md — New/Save/Open. This MVP stands the real file system
// in with a browser download (Save) and a file picker (Open); a File System Access
// API / IndexedDB autosave adapter is Phase 2 (docs/specs §00-overview-and-scope).
export function FileMenu({ store, onNewProject }: { store: EditorStore; onNewProject: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleNew() {
    store.loadProject(createEmptyProject());
    onNewProject();
  }

  function handleSave() {
    const file = store.toProjectFile();
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "string-art-project.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleOpenClick() {
    fileInputRef.current?.click();
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = migrateProjectFile(JSON.parse(text));
      store.loadProject(projectFileToDocument(parsed));
      store.setViewport(fitViewportForBoard(store.getState().board));
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Could not open that project file.");
    }
  }

  return (
    <div style={{ display: "flex", gap: 6 }}>
      <button className="btn" onClick={handleNew} style={{ borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 600 }}>
        New
      </button>
      <button className="btn" onClick={handleSave} style={{ borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 600 }}>
        Save
      </button>
      <button className="btn" onClick={handleOpenClick} style={{ borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 600 }}>
        Open
      </button>
      <input ref={fileInputRef} type="file" accept="application/json" onChange={handleFileSelected} style={{ display: "none" }} />
    </div>
  );
}
