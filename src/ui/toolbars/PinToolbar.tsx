import { Circle, Ellipse, Eraser, Minus, PenTool, RectangleHorizontal, Shapes, Spline, Square, Trash2, Type, Waypoints } from "lucide-react";
import type { ComponentType } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import type { EditorStore, PinTool } from "../../application/document";
import { useEditorState } from "../useEditorStore";

// docs/specs/34-keyboard-shortcuts.md — bare-letter shortcut per Pin-tab tool, shown
// as a "[X]" suffix on each button's label.
export const PIN_TOOL_SHORTCUT_KEY: Partial<Record<PinTool, string>> = {
  line: "L",
  arc: "A",
  ellipse: "E",
  circle: "C",
  rectangle: "R",
  square: "S",
  freehand: "F",
  polygon: "P",
  text: "T",
  eraser: "D",
  "path-eraser": "Q",
};

function basicTools(t: TFunction<"toolbars">): { id: PinTool; label: string; icon: ComponentType<{ size?: number }> }[] {
  return [
    { id: "line", label: t("pinToolbar.basicTools.line"), icon: Minus },
    { id: "arc", label: t("pinToolbar.basicTools.arc"), icon: Spline },
    { id: "ellipse", label: t("pinToolbar.basicTools.ellipse"), icon: Ellipse },
    { id: "circle", label: t("pinToolbar.basicTools.circle"), icon: Circle },
    { id: "rectangle", label: t("pinToolbar.basicTools.rectangle"), icon: RectangleHorizontal },
    { id: "square", label: t("pinToolbar.basicTools.square"), icon: Square },
    { id: "freehand", label: t("pinToolbar.basicTools.freehand"), icon: PenTool },
    { id: "polygon", label: t("pinToolbar.basicTools.path"), icon: Waypoints },
    { id: "text", label: t("pinToolbar.basicTools.text"), icon: Type },
  ];
}

function polygonFamily(t: TFunction<"toolbars">): { id: PinTool; label: string }[] {
  return [
    { id: "pentagon", label: t("pinToolbar.polygonFamily.pentagon") },
    { id: "hexagon", label: t("pinToolbar.polygonFamily.hexagon") },
    { id: "octagon", label: t("pinToolbar.polygonFamily.octagon") },
    { id: "star-5", label: t("pinToolbar.polygonFamily.star-5") },
    { id: "star-6", label: t("pinToolbar.polygonFamily.star-6") },
    { id: "star-8", label: t("pinToolbar.polygonFamily.star-8") },
    { id: "pentagram", label: t("pinToolbar.polygonFamily.pentagram") },
    { id: "heptagram", label: t("pinToolbar.polygonFamily.heptagram") },
    { id: "octagram", label: t("pinToolbar.polygonFamily.octagram") },
  ];
}

const CHIP_STYLE = {
  flexDirection: "column" as const,
  borderRadius: "var(--radius-sm)",
  padding: "10px 4px 7px",
  gap: 5,
  fontSize: 10,
  fontWeight: 600,
};

export function PinToolbar({ store }: { store: EditorStore }) {
  const { t } = useTranslation("toolbars");
  const state = useEditorState(store);
  const BASIC_TOOLS = basicTools(t);
  const POLYGON_FAMILY = polygonFamily(t);
  const isPolygonFamilySelected = POLYGON_FAMILY.some((tool) => tool.id === state.pinTool);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--text-tertiary)", textTransform: "uppercase" }}>
        {t("pinToolbar.sectionTitle")}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
        {BASIC_TOOLS.map((tool) => (
          <button
            key={tool.id}
            className={`btn${state.pinTool === tool.id ? " btn-active" : ""}`}
            onClick={() => store.setPinTool(tool.id)}
            style={CHIP_STYLE}
          >
            <tool.icon size={16} />
            {tool.label} [{PIN_TOOL_SHORTCUT_KEY[tool.id]}]
          </button>
        ))}
        <button className={`btn${state.pinTool === "eraser" ? " btn-active" : ""}`} onClick={() => store.setPinTool("eraser")} style={CHIP_STYLE}>
          <Eraser size={16} />
          {t("pinToolbar.eraser")} [{PIN_TOOL_SHORTCUT_KEY.eraser}]
        </button>
        <button className={`btn${state.pinTool === "path-eraser" ? " btn-active" : ""}`} onClick={() => store.setPinTool("path-eraser")} style={CHIP_STYLE}>
          <Trash2 size={16} />
          {t("pinToolbar.pathEraser")} [{PIN_TOOL_SHORTCUT_KEY["path-eraser"]}]
        </button>
      </div>

      <label
        className={`btn${isPolygonFamilySelected ? " btn-active" : ""}`}
        style={{ width: "100%", justifyContent: "space-between", borderRadius: "var(--radius-sm)", padding: "9px 10px", gap: 6 }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600 }}>
          <Shapes size={14} />
          {t("pinToolbar.polygonStarLabel")}
        </span>
        <select
          aria-label={t("pinToolbar.polygonStarLabel")}
          value={isPolygonFamilySelected ? state.pinTool : ""}
          onChange={(e) => store.setPinTool(e.target.value as PinTool)}
          style={{ background: "transparent", color: "inherit", border: "none", fontSize: 12 }}
        >
          <option value="" disabled>
            {t("pinToolbar.choosePlaceholder")}
          </option>
          {POLYGON_FAMILY.map((tool) => (
            <option key={tool.id} value={tool.id}>
              {tool.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
