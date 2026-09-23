import { useTranslation } from "react-i18next";
import { distributeClosedPath, distributeOpenPath, distributePathPerVertex, pathLength } from "@domain/paths";
import { geometryToPath, isVertexAnchoredGeometry, type EditorMode, type PinPathGeometry, type PinTool } from "@application/document";
import "./StatusBar.css";

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
  const { t } = useTranslation("canvas");
  const text = (() => {
    if (mode === "pin" && previewGeometry) {
      const path = geometryToPath(previewGeometry);
      if (isVertexAnchoredGeometry(previewGeometry.type)) {
        const { n, actualSpacing } = distributePathPerVertex(path, spacing);
        const label = path.closed ? t("status.perimeter") : t("status.length");
        return t("status.geometryPreview", { label, length: pathLength(path).toFixed(1), requested: spacing.toFixed(1), actual: actualSpacing.toFixed(2), pins: n });
      }
      if (path.closed) {
        const { n, actualSpacing } = distributeClosedPath(path, spacing);
        return t("status.geometryPreview", { label: t("status.perimeter"), length: pathLength(path).toFixed(1), requested: spacing.toFixed(1), actual: actualSpacing.toFixed(2), pins: n });
      }
      const pins = distributeOpenPath(path, spacing);
      return t("status.openPathPreview", { label: t("status.length"), length: pathLength(path).toFixed(1), pins: pins.length, gap: spacing.toFixed(1) });
    }
    if (mode === "pin")
      return t("status.pinToolHint", {
        tool: pinTool,
        action: ["ellipse", "circle", "rectangle", "square"].includes(pinTool) ? t("status.clickDragAction") : t("status.clickAction"),
      });
    if (mode === "select" || mode === "pan") {
      if (!cursor) return t("status.zoom", { zoom: zoomPercent });
      return t("status.cursor", { x: cursor.x.toFixed(1), y: cursor.y.toFixed(1), zoom: zoomPercent });
    }
    return threadStatusText ?? t("status.threadDefault");
  })();

  return (
    <div className="mono status-bar">
      {text}
    </div>
  );
}
