import { Circle, Eraser, Minus, RectangleHorizontal, Shapes, Spline, Square } from "lucide-react";
import type { ComponentType } from "react";
import type { EditorStore, PinTool } from "../../application/document";
import { useEditorState } from "../useEditorStore";

const BASIC_TOOLS: { id: PinTool; label: string; icon: ComponentType<{ size?: number }> }[] = [
  { id: "line", label: "Line", icon: Minus },
  { id: "arc", label: "Arc", icon: Spline },
  { id: "ellipse", label: "Ellipse", icon: Circle },
  { id: "circle", label: "Circle", icon: Circle },
  { id: "rectangle", label: "Rect", icon: RectangleHorizontal },
  { id: "square", label: "Square", icon: Square },
];

const POLYGON_FAMILY: { id: PinTool; label: string }[] = [
  { id: "pentagon", label: "Pentagon" },
  { id: "hexagon", label: "Hexagon" },
  { id: "octagon", label: "Octagon" },
  { id: "star-5", label: "5-point star" },
  { id: "star-6", label: "6-point star" },
  { id: "star-8", label: "8-point star" },
  { id: "pentagram", label: "Pentagram" },
  { id: "heptagram", label: "Heptagram" },
  { id: "octagram", label: "Octagram" },
];

const CHIP_STYLE = {
  flexDirection: "column" as const,
  borderRadius: "var(--radius-sm)",
  padding: "10px 4px 7px",
  gap: 5,
  fontSize: 10,
  fontWeight: 600,
};

export function PinToolbar({ store }: { store: EditorStore }) {
  const state = useEditorState(store);
  const isPolygonFamilySelected = POLYGON_FAMILY.some((t) => t.id === state.pinTool);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--text-tertiary)", textTransform: "uppercase" }}>
        Pin Tools
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
        {BASIC_TOOLS.map((t) => (
          <button
            key={t.id}
            className={`btn${state.pinTool === t.id ? " btn-active" : ""}`}
            onClick={() => store.setPinTool(t.id)}
            style={CHIP_STYLE}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
        <button className={`btn${state.pinTool === "eraser" ? " btn-active" : ""}`} onClick={() => store.setPinTool("eraser")} style={CHIP_STYLE}>
          <Eraser size={16} />
          Eraser
        </button>
      </div>

      <label
        className={`btn${isPolygonFamilySelected ? " btn-active" : ""}`}
        style={{ width: "100%", justifyContent: "space-between", borderRadius: "var(--radius-sm)", padding: "9px 10px", gap: 6 }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600 }}>
          <Shapes size={14} />
          Polygon / Star
        </span>
        <select
          aria-label="Polygon / Star"
          value={isPolygonFamilySelected ? state.pinTool : ""}
          onChange={(e) => store.setPinTool(e.target.value as PinTool)}
          style={{ background: "transparent", color: "inherit", border: "none", fontSize: 12 }}
        >
          <option value="" disabled>
            Choose…
          </option>
          {POLYGON_FAMILY.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
