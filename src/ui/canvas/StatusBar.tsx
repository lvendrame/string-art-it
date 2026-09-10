import { distributeClosedPath, distributeOpenPath, pathLength } from "../../domain/paths";
import { geometryToPath, type EditorMode, type PinPathGeometry, type PinTool } from "../../application/document";

export function StatusBar({
  mode,
  zoomPercent,
  cursor,
  pinTool,
  previewGeometry,
  spacing,
  threadStatusText,
}: {
  mode: EditorMode;
  zoomPercent: number;
  cursor: { x: number; y: number } | null;
  pinTool: PinTool;
  previewGeometry: PinPathGeometry | null;
  spacing: number;
  threadStatusText?: string | null;
}) {
  const text = (() => {
    if (mode === "pin" && previewGeometry) {
      const path = geometryToPath(previewGeometry);
      if (path.closed) {
        const { n, actualSpacing } = distributeClosedPath(path, spacing);
        return `Perimeter: ${pathLength(path).toFixed(1)} cm | Requested: ${spacing.toFixed(1)} cm | Actual: ${actualSpacing.toFixed(2)} cm | Pins: ${n}`;
      }
      const pins = distributeOpenPath(path, spacing);
      return `Length: ${pathLength(path).toFixed(1)} cm | Pins: ${pins.length} | Gap: ${spacing.toFixed(1)} cm`;
    }
    if (mode === "pin") return `Tool: ${pinTool} — click${["ellipse", "circle", "rectangle", "square"].includes(pinTool) ? "-drag" : ""} on the board to draw.`;
    if (mode === "select" || mode === "pan") {
      if (!cursor) return `Zoom: ${zoomPercent}%`;
      return `X: ${cursor.x.toFixed(1)} cm | Y: ${cursor.y.toFixed(1)} cm | Zoom: ${zoomPercent}%`;
    }
    return threadStatusText ?? "Thread mode: click a pin to start a Thread Path.";
  })();

  return (
    <div
      className="mono"
      style={{
        flex: "0 0 auto",
        height: 32,
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "0 16px",
        background: "var(--bg-panel)",
        borderTop: "1px solid var(--border)",
        fontSize: 11.5,
        color: "var(--text-secondary)",
      }}
    >
      {text}
    </div>
  );
}
