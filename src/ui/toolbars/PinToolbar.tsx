import { Circle, Ellipse, Eraser, Minus, PenTool, RectangleHorizontal, Shapes, Spline, Square, Trash2, Type, Waypoints } from "lucide-react";
import type { ComponentType } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import type { EditorStore, PinTool } from "../../application/document";
import { useEditorState } from "../useEditorStore";
import { PIN_TOOL_SHORTCUT_KEY } from "./pinToolShortcuts";
import "./PinToolbar.css";

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

export function PinToolbar({ store }: { store: EditorStore }) {
  const { t } = useTranslation("toolbars");
  const state = useEditorState(store);
  const BASIC_TOOLS = basicTools(t);
  const POLYGON_FAMILY = polygonFamily(t);
  const isPolygonFamilySelected = POLYGON_FAMILY.some((tool) => tool.id === state.pinTool);

  return (
    <div className="pin-toolbar">
      <div className="pin-toolbar__section-title">{t("pinToolbar.sectionTitle")}</div>
      <div className="pin-toolbar__grid">
        {BASIC_TOOLS.map((tool) => (
          <button
            key={tool.id}
            className={`btn pin-toolbar__chip${state.pinTool === tool.id ? " btn-active" : ""}`}
            onClick={() => store.setPinTool(tool.id)}
          >
            <tool.icon size={16} />
            {tool.label} [{PIN_TOOL_SHORTCUT_KEY[tool.id]}]
          </button>
        ))}
        <button
          className={`btn pin-toolbar__chip${state.pinTool === "eraser" ? " btn-active" : ""}`}
          onClick={() => store.setPinTool("eraser")}
        >
          <Eraser size={16} />
          {t("pinToolbar.eraser")} [{PIN_TOOL_SHORTCUT_KEY.eraser}]
        </button>
        <button
          className={`btn pin-toolbar__chip${state.pinTool === "path-eraser" ? " btn-active" : ""}`}
          onClick={() => store.setPinTool("path-eraser")}
        >
          <Trash2 size={16} />
          {t("pinToolbar.pathEraser")} [{PIN_TOOL_SHORTCUT_KEY["path-eraser"]}]
        </button>
      </div>

      <label className={`btn pin-toolbar__picker${isPolygonFamilySelected ? " btn-active" : ""}`}>
        <span className="pin-toolbar__picker-label">
          <Shapes size={14} />
          {t("pinToolbar.polygonStarLabel")}
        </span>
        <select
          aria-label={t("pinToolbar.polygonStarLabel")}
          value={isPolygonFamilySelected ? state.pinTool : ""}
          onChange={(e) => store.setPinTool(e.target.value as PinTool)}
          className="pin-toolbar__select"
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
