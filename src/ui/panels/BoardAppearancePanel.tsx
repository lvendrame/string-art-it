import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import type { BoardAppearance, EditorStore } from "@application/document";
import { PAINT_PRESET_IDS, WOOD_PRESET_IDS } from "@infrastructure/rendering/boardFillUtils";
import { useEditorState } from "@ui/useEditorStore";
import "./BoardAppearancePanel.css";

function typeOptions(t: TFunction<"boardSetup">): { id: BoardAppearance["type"]; label: string }[] {
  return [
    { id: "solid", label: t("appearance.types.solid") },
    { id: "linear-gradient", label: t("appearance.types.linearGradient") },
    { id: "radial-gradient", label: t("appearance.types.radialGradient") },
    { id: "wood-texture", label: t("appearance.types.woodTexture") },
    { id: "painted-wood", label: t("appearance.types.paintedWood") },
    { id: "custom-texture", label: t("appearance.types.customTexture") },
  ];
}

function defaultFor(type: BoardAppearance["type"]): BoardAppearance {
  switch (type) {
    case "solid":
      return { type: "solid", colour: "#8a5a3c" };
    case "linear-gradient":
      return { type: "linear-gradient", stops: [{ offset: 0, colour: "#8a5a3c" }, { offset: 100, colour: "#3a2318" }], direction: 45 };
    case "radial-gradient":
      return { type: "radial-gradient", stops: [{ offset: 0, colour: "#c9a06a" }, { offset: 100, colour: "#4a2a1a" }], centre: { x: 40, y: 35 } };
    case "wood-texture":
      return { type: "wood-texture", presetId: "walnut" };
    case "painted-wood":
      return { type: "painted-wood", presetId: "sage" };
    case "custom-texture":
      return { type: "custom-texture", imageDataUrl: "" };
  }
}

async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// docs/specs/04-board-appearance.md + Phase 2 "rich/uploaded board textures".
export function BoardAppearancePanel({ store }: { store: EditorStore }) {
  const { t } = useTranslation("boardSetup");
  const state = useEditorState(store);
  const appearance = state.board.appearance;
  const types = typeOptions(t);

  return (
    <div className="board-appearance-panel">
      <div className="board-appearance-panel__section-title">{t("appearance.section")}</div>
      <div className="board-appearance-panel__type-grid">
        {types.map((ty) => (
          <button
            key={ty.id}
            className={`btn board-appearance-panel__type-btn${appearance.type === ty.id ? " btn-active" : ""}`}
            onClick={() => store.setBoardAppearance(defaultFor(ty.id))}
          >
            {ty.label}
          </button>
        ))}
      </div>

      {appearance.type === "solid" && (
        <label className="board-appearance-panel__row">
          {t("appearance.colour")}
          <input
            type="color"
            value={appearance.colour}
            onChange={(e) => store.setBoardAppearance({ type: "solid", colour: e.target.value })}
            className="board-appearance-panel__color-swatch"
          />
        </label>
      )}

      {(appearance.type === "linear-gradient" || appearance.type === "radial-gradient") && (
        <div className="board-appearance-panel__stack">
          <div className="board-appearance-panel__stops-row">
            {appearance.stops.map((s, i) => (
              <input
                key={i}
                type="color"
                value={s.colour}
                onChange={(e) => {
                  const stops = appearance.stops.map((stop, idx) => (idx === i ? { ...stop, colour: e.target.value } : stop));
                  store.setBoardAppearance({ ...appearance, stops });
                }}
                className="board-appearance-panel__color-swatch"
              />
            ))}
          </div>
          {appearance.type === "linear-gradient" ? (
            <label className="board-appearance-panel__row">
              {t("appearance.direction")}
              <input
                type="number"
                className="mono board-appearance-panel__number-input board-appearance-panel__number-input--direction"
                value={appearance.direction}
                onChange={(e) => store.setBoardAppearance({ ...appearance, direction: Number(e.target.value) })}
              />
            </label>
          ) : (
            <div className="board-appearance-panel__stops-row">
              <label className="board-appearance-panel__coord-label">
                {t("appearance.centreX")}
                <input
                  type="number"
                  className="mono board-appearance-panel__number-input"
                  value={appearance.centre.x}
                  onChange={(e) => store.setBoardAppearance({ ...appearance, centre: { ...appearance.centre, x: Number(e.target.value) } })}
                />
              </label>
              <label className="board-appearance-panel__coord-label">
                {t("appearance.centreY")}
                <input
                  type="number"
                  className="mono board-appearance-panel__number-input"
                  value={appearance.centre.y}
                  onChange={(e) => store.setBoardAppearance({ ...appearance, centre: { ...appearance.centre, y: Number(e.target.value) } })}
                />
              </label>
            </div>
          )}
        </div>
      )}

      {(appearance.type === "wood-texture" || appearance.type === "painted-wood") && (
        <select
          aria-label={t("appearance.presetLabel")}
          value={appearance.presetId}
          onChange={(e) => store.setBoardAppearance({ type: appearance.type, presetId: e.target.value })}
          className="board-appearance-panel__select"
        >
          {(appearance.type === "wood-texture" ? WOOD_PRESET_IDS : PAINT_PRESET_IDS).map((id) => (
            <option key={id} value={id}>
              {t(`appearance.presets.${id}`, { defaultValue: id[0].toUpperCase() + id.slice(1) })}
            </option>
          ))}
        </select>
      )}

      {appearance.type === "custom-texture" && (
        <div className="board-appearance-panel__stack">
          <input
            type="file"
            accept="image/*"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const imageDataUrl = await readFileAsDataUrl(file);
              store.setBoardAppearance({ type: "custom-texture", imageDataUrl });
            }}
            className="board-appearance-panel__file-input"
          />
          {appearance.imageDataUrl && (
            <img
              src={appearance.imageDataUrl}
              alt={t("appearance.texturePreviewAlt")}
              className="board-appearance-panel__texture-preview"
            />
          )}
        </div>
      )}
    </div>
  );
}
