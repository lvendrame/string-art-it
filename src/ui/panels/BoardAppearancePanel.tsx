import type { BoardAppearance, EditorStore } from "../../application/document";
import { PAINT_PRESET_IDS, WOOD_PRESET_IDS } from "../../infrastructure/rendering/boardFill";
import { useEditorState } from "../useEditorStore";

const TYPES: { id: BoardAppearance["type"]; label: string }[] = [
  { id: "solid", label: "Solid" },
  { id: "linear-gradient", label: "Linear" },
  { id: "radial-gradient", label: "Radial" },
  { id: "wood-texture", label: "Wood" },
  { id: "painted-wood", label: "Painted" },
  { id: "custom-texture", label: "Custom" },
];

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
  const state = useEditorState(store);
  const appearance = state.board.appearance;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--text-tertiary)", textTransform: "uppercase" }}>
        Appearance
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
        {TYPES.map((t) => (
          <button
            key={t.id}
            className={`btn${appearance.type === t.id ? " btn-active" : ""}`}
            onClick={() => store.setBoardAppearance(defaultFor(t.id))}
            style={{ justifyContent: "center", borderRadius: "var(--radius-sm)", padding: "9px 4px", fontSize: 11.5, fontWeight: 600 }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {appearance.type === "solid" && (
        <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "var(--text-secondary)" }}>
          Colour
          <input type="color" value={appearance.colour} onChange={(e) => store.setBoardAppearance({ type: "solid", colour: e.target.value })} style={{ width: 32, height: 22, border: "1px solid var(--border)", borderRadius: 4, background: "none" }} />
        </label>
      )}

      {(appearance.type === "linear-gradient" || appearance.type === "radial-gradient") && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 6 }}>
            {appearance.stops.map((s, i) => (
              <input
                key={i}
                type="color"
                value={s.colour}
                onChange={(e) => {
                  const stops = appearance.stops.map((stop, idx) => (idx === i ? { ...stop, colour: e.target.value } : stop));
                  store.setBoardAppearance({ ...appearance, stops });
                }}
                style={{ width: 32, height: 22, border: "1px solid var(--border)", borderRadius: 4, background: "none" }}
              />
            ))}
          </div>
          {appearance.type === "linear-gradient" ? (
            <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "var(--text-secondary)" }}>
              Direction (°)
              <input
                type="number"
                className="mono"
                value={appearance.direction}
                onChange={(e) => store.setBoardAppearance({ ...appearance, direction: Number(e.target.value) })}
                style={{ width: 70, background: "var(--bg-app)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", padding: "4px 6px" }}
              />
            </label>
          ) : (
            <div style={{ display: "flex", gap: 6 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11.5, color: "var(--text-secondary)", flex: 1 }}>
                Centre X %
                <input
                  type="number"
                  className="mono"
                  value={appearance.centre.x}
                  onChange={(e) => store.setBoardAppearance({ ...appearance, centre: { ...appearance.centre, x: Number(e.target.value) } })}
                  style={{ background: "var(--bg-app)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", padding: "4px 6px" }}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11.5, color: "var(--text-secondary)", flex: 1 }}>
                Centre Y %
                <input
                  type="number"
                  className="mono"
                  value={appearance.centre.y}
                  onChange={(e) => store.setBoardAppearance({ ...appearance, centre: { ...appearance.centre, y: Number(e.target.value) } })}
                  style={{ background: "var(--bg-app)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", padding: "4px 6px" }}
                />
              </label>
            </div>
          )}
        </div>
      )}

      {(appearance.type === "wood-texture" || appearance.type === "painted-wood") && (
        <select
          value={appearance.presetId}
          onChange={(e) => store.setBoardAppearance({ type: appearance.type, presetId: e.target.value })}
          style={{ background: "var(--bg-app)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", padding: "6px 8px", fontSize: 13 }}
        >
          {(appearance.type === "wood-texture" ? WOOD_PRESET_IDS : PAINT_PRESET_IDS).map((id) => (
            <option key={id} value={id}>
              {id[0].toUpperCase() + id.slice(1)}
            </option>
          ))}
        </select>
      )}

      {appearance.type === "custom-texture" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input
            type="file"
            accept="image/*"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const imageDataUrl = await readFileAsDataUrl(file);
              store.setBoardAppearance({ type: "custom-texture", imageDataUrl });
            }}
            style={{ fontSize: 12, color: "var(--text-secondary)" }}
          />
          {appearance.imageDataUrl && (
            <img src={appearance.imageDataUrl} alt="Board texture preview" style={{ width: "100%", height: 60, objectFit: "cover", borderRadius: 6, border: "1px solid var(--border)" }} />
          )}
        </div>
      )}
    </div>
  );
}
