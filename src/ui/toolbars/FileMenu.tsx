import { forwardRef, useImperativeHandle, useRef } from "react";
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
import { saveProjectFile } from "./projectFileDownload";
import "./FileMenu.css";

const FILE_MENU_TOOLTIP_ID = "file-menu-tooltip";

// docs/specs/34-keyboard-shortcuts.md — Ctrl/Cmd+O needs to click this component's own
// hidden file input; exposed imperatively rather than duplicating the picker.
export interface FileMenuHandle {
  openFilePicker: () => void;
}

// docs/specs/16-persistence.md — New/Save/Open. This MVP stands the real file system
// in with a browser download (Save) and a file picker (Open); a File System Access
// API / IndexedDB autosave adapter is Phase 2 (docs/specs §00-overview-and-scope).
export const FileMenu = forwardRef<FileMenuHandle, { store: EditorStore; onNewProject: () => void }>(function FileMenu(
  { store, onNewProject },
  ref,
) {
  const { t } = useTranslation(["menus", "errors"]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleNew() {
    store.loadProject(createEmptyProject());
    onNewProject();
  }

  function handleOpenClick() {
    fileInputRef.current?.click();
  }

  useImperativeHandle(ref, () => ({ openFilePicker: handleOpenClick }));

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
    <div className="file-menu">
      <button
        className="btn file-menu__btn"
        onClick={handleNew}
        aria-label={t("file.new")}
        data-tooltip-id={FILE_MENU_TOOLTIP_ID}
        data-tooltip-content={t("file.new")}
      >
        <FilePlus size={14} />
      </button>
      <button
        className="btn file-menu__btn"
        onClick={() => saveProjectFile(store)}
        aria-label={t("file.save")}
        data-tooltip-id={FILE_MENU_TOOLTIP_ID}
        data-tooltip-content={t("file.save")}
      >
        <Save size={14} />
      </button>
      <button
        className="btn file-menu__btn"
        onClick={handleOpenClick}
        aria-label={t("file.open")}
        data-tooltip-id={FILE_MENU_TOOLTIP_ID}
        data-tooltip-content={t("file.open")}
      >
        <FolderOpen size={14} />
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        onChange={handleFileSelected}
        className="file-menu__file-input"
      />
      <Tooltip id={FILE_MENU_TOOLTIP_ID} place="top" />
    </div>
  );
});
