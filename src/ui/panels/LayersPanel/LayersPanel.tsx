import { ChevronDown, ChevronUp, Copy, Plus, Trash2 } from "lucide-react";
import { Tooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";
import { useTranslation } from "react-i18next";
import type { EditorStore } from "@application/document";
import { useEditorState } from "@ui/useEditorStore";
import { IconActionButton, LAYERS_TOOLTIP_ID } from "./IconActionButton";
import { LayerRow } from "./LayerRow";
import type { Row } from "./types";
import "./LayersPanel.css";

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
