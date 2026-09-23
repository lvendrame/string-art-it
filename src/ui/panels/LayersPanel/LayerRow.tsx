import { useState } from "react";
import type { TFunction } from "i18next";
import { EyeIcon } from "./EyeIcon";
import { LockIcon } from "./LockIcon";
import type { Row } from "./types";
import "./LayerRow.css";

export function LayerRow({
  layer,
  active,
  onSelect,
  onToggleVisible,
  onToggleLocked,
  onRename,
  t,
}: {
  layer: Row;
  active: boolean;
  onSelect: () => void;
  onToggleVisible: () => void;
  onToggleLocked: () => void;
  onRename: (name: string) => void;
  t: TFunction<"panels">;
}) {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(layer.name);

  return (
    <div onClick={onSelect} className={`layers-panel__row${active ? " layers-panel__row--active" : ""}`}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleVisible();
        }}
        className={`layers-panel__icon-btn${layer.visible ? " layers-panel__icon-btn--visible" : ""}`}
        aria-label={layer.visible ? t("layersPanel.hideLayer", { name: layer.name }) : t("layersPanel.showLayer", { name: layer.name })}
      >
        <EyeIcon open={layer.visible} />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleLocked();
        }}
        className={`layers-panel__icon-btn${layer.locked ? " layers-panel__icon-btn--locked" : ""}`}
        aria-label={layer.locked ? t("layersPanel.unlockLayer", { name: layer.name }) : t("layersPanel.lockLayer", { name: layer.name })}
      >
        <LockIcon locked={layer.locked} />
      </button>
      {editing ? (
        <input
          autoFocus
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onBlur={() => {
            setEditing(false);
            onRename(draftName);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setEditing(false);
              onRename(draftName);
            }
          }}
          className="layers-panel__rename-input"
        />
      ) : (
        <span
          onDoubleClick={(e) => {
            e.stopPropagation();
            setDraftName(layer.name);
            setEditing(true);
          }}
          className={`layers-panel__name${layer.visible ? " layers-panel__name--visible" : ""}`}
        >
          {layer.name}
        </span>
      )}
    </div>
  );
}
