import { useState } from "react";
import { ChevronDown, ChevronUp, Copy, Plus, Trash2 } from "lucide-react";
import { Tooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import type { EditorStore } from "../../application/document";
import { useEditorState } from "../useEditorStore";
import "./LayersPanel.css";

const LAYERS_TOOLTIP_ID = "layers-panel-actions-tooltip";

// Icon-only so the 5-button row always fits the fixed-width side panel — the full
// label still reaches assistive tech via aria-label and sighted users via the
// react-tooltip hover/focus tooltip (docs/specs/13-layers.md action bar).
function IconActionButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  danger,
}: {
  icon: typeof Plus;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      className={`btn layers-panel__action-btn${danger ? " layers-panel__action-btn--danger" : ""}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      data-tooltip-id={LAYERS_TOOLTIP_ID}
      data-tooltip-content={label}
    >
      <Icon size={15} />
    </button>
  );
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg viewBox="0 0 24 24" width={14} height={14}>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" stroke="currentColor" strokeWidth={1.5} fill="none" />
      <circle cx={12} cy={12} r={3} stroke="currentColor" strokeWidth={1.5} fill="none" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" width={14} height={14}>
      <path d="M3 3l18 18M10.6 10.6a3 3 0 0 0 4.2 4.2M6.5 6.7C4 8.3 2 12 2 12s4 7 10 7c1.7 0 3.2-.4 4.5-1.1M9.9 5.2A10 10 0 0 1 12 5c6 0 10 7 10 7a15 15 0 0 1-2.3 3.1" stroke="currentColor" strokeWidth={1.5} fill="none" strokeLinecap="round" />
    </svg>
  );
}

function LockIcon({ locked }: { locked: boolean }) {
  return locked ? (
    <svg viewBox="0 0 24 24" width={14} height={14}>
      <rect x={5} y={11} width={14} height={9} rx={1.5} stroke="currentColor" strokeWidth={1.5} fill="none" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" strokeWidth={1.5} fill="none" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" width={14} height={14}>
      <rect x={5} y={11} width={14} height={9} rx={1.5} stroke="currentColor" strokeWidth={1.5} fill="none" />
      <path d="M8 11V7a4 4 0 0 1 7.5-2" stroke="currentColor" strokeWidth={1.5} fill="none" strokeLinecap="round" />
    </svg>
  );
}

interface Row {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
}

function LayerRow({
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

// docs/specs/13-layers.md + 32/33 — two independent layer systems, same row anatomy.
export function LayersPanel({ store }: { store: EditorStore }) {
  const { t } = useTranslation("panels");
  const state = useEditorState(store);
  const isPin = state.layerPanelTab === "pin";

  const rows: Row[] = isPin ? state.pinLayers : state.threadLayers;
  const activeId = isPin ? state.activePinLayerId : state.activeThreadLayerId;

  const actions = isPin
    ? {
        select: (id: string) => store.setActivePinLayer(id),
        toggleVisible: (id: string) => store.togglePinLayerVisible(id),
        toggleLocked: (id: string) => store.togglePinLayerLocked(id),
        rename: (id: string, name: string) => store.renamePinLayer(id, name),
        add: () => store.addPinLayer(),
        duplicate: (id: string) => store.duplicatePinLayer(id),
        remove: (id: string) => store.deletePinLayer(id),
        reorder: (id: string, dir: -1 | 1) => store.reorderPinLayer(id, dir),
      }
    : {
        select: (id: string) => store.setActiveThreadLayer(id),
        toggleVisible: (id: string) => store.toggleThreadLayerVisible(id),
        toggleLocked: (id: string) => store.toggleThreadLayerLocked(id),
        rename: (id: string, name: string) => store.renameThreadLayer(id, name),
        add: () => store.addThreadLayer(),
        duplicate: (id: string) => store.duplicateThreadLayer(id),
        remove: (id: string) => store.deleteThreadLayer(id),
        reorder: (id: string, dir: -1 | 1) => store.reorderThreadLayer(id, dir),
      };

  return (
    <div className="layers-panel">
      <div className="layers-panel__tabs">
        <button
          onClick={() => store.setLayerPanelTab("pin")}
          className={`tab-underline layers-panel__tab${isPin ? " tab-underline--active" : ""}`}
        >
          {t("layersPanel.pinLayersTab")}
        </button>
        <button
          onClick={() => store.setLayerPanelTab("thread")}
          className={`tab-underline layers-panel__tab${!isPin ? " tab-underline--active" : ""}`}
        >
          {t("layersPanel.threadLayersTab")}
        </button>
      </div>

      <div className="layers-panel__rows">
        {rows.map((layer) => (
          <LayerRow
            key={layer.id}
            layer={layer}
            active={layer.id === activeId}
            onSelect={() => actions.select(layer.id)}
            onToggleVisible={() => actions.toggleVisible(layer.id)}
            onToggleLocked={() => actions.toggleLocked(layer.id)}
            onRename={(name) => actions.rename(layer.id, name.trim() || layer.name)}
            t={t}
          />
        ))}
      </div>

      <div className="layers-panel__footer">
        <IconActionButton icon={Plus} label={t("layersPanel.newLayer")} onClick={actions.add} />
        <IconActionButton icon={Copy} label={t("layersPanel.duplicate")} onClick={() => actions.duplicate(activeId)} />
        <IconActionButton icon={ChevronUp} label={t("layersPanel.moveUp")} onClick={() => actions.reorder(activeId, -1)} />
        <IconActionButton icon={ChevronDown} label={t("layersPanel.moveDown")} onClick={() => actions.reorder(activeId, 1)} />
        <IconActionButton
          icon={Trash2}
          label={t("layersPanel.delete")}
          onClick={() => rows.length > 1 && actions.remove(activeId)}
          disabled={rows.length <= 1}
          danger
        />
      </div>
      <Tooltip id={LAYERS_TOOLTIP_ID} place="top" />
    </div>
  );
}
