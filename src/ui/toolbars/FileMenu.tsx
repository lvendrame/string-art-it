import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { FilePlus, FolderOpen, Save } from "lucide-react";
import { Tooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";
import {
  createEmptyProject,
  migrateProjectFile,
  projectFileToDocument,
  type EditorStore,
} from "../../application/document";
import { fitViewportForBoard } from "../canvas/boardViewport";
import { mapOpenFileError } from "./openFileErrors";

const FILE_MENU_TOOLTIP_ID = "file-menu-tooltip";

// docs/specs/16-persistence.md — New/Save/Open. This MVP stands the real file system
// in with a browser download (Save) and a file picker (Open); a File System Access
// API / IndexedDB autosave adapter is Phase 2 (docs/specs §00-overview-and-scope).
export function FileMenu({ store, onNewProject }: { store: EditorStore; onNewProject: () => void }) {
  const { t } = useTranslation(["menus", "errors"]);
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
      window.alert(mapOpenFileError(err, t));
    }
  }

  return (
    <div style={{ display: "flex", gap: 6 }}>
      <button
        className="btn"
        onClick={handleNew}
        aria-label={t("file.new")}
        data-tooltip-id={FILE_MENU_TOOLTIP_ID}
        data-tooltip-content={t("file.new")}
        style={{ borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 600, gap: 6 }}
      >
        <FilePlus size={14} />
      </button>
      <button
        className="btn"
        onClick={handleSave}
        aria-label={t("file.save")}
        data-tooltip-id={FILE_MENU_TOOLTIP_ID}
        data-tooltip-content={t("file.save")}
        style={{ borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 600, gap: 6 }}
      >
        <Save size={14} />
      </button>
      <button
        className="btn"
        onClick={handleOpenClick}
        aria-label={t("file.open")}
        data-tooltip-id={FILE_MENU_TOOLTIP_ID}
        data-tooltip-content={t("file.open")}
        style={{ borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 600, gap: 6 }}
      >
        <FolderOpen size={14} />
      </button>
      <input ref={fileInputRef} type="file" accept="application/json" onChange={handleFileSelected} style={{ display: "none" }} />
      <Tooltip id={FILE_MENU_TOOLTIP_ID} place="top" />
    </div>
  );
}
