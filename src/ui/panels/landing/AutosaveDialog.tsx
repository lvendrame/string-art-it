import { useTranslation } from "react-i18next";
import "./AutosaveDialog.css";

interface AutosaveDialogProps {
  onRestore: () => void;
  onDiscard: () => void;
}

// Only rendered on the "New board" landing page — App.tsx gates it on !entered,
// since once a document is open there's nothing left to offer restoring into.
export function AutosaveDialog({ onRestore, onDiscard }: AutosaveDialogProps) {
  const { t } = useTranslation("common");

  return (
    <div className="autosave-dialog">
      <span>{t("autosave.found")}</span>
      <button className="btn autosave-dialog__restore" onClick={onRestore}>
        {t("autosave.restore")}
      </button>
      <button className="btn autosave-dialog__discard" onClick={onDiscard}>
        {t("autosave.discard")}
      </button>
    </div>
  );
}
