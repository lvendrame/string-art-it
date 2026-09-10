import { useState } from "react";
import {
  curvatureFromCursor,
  DRAG_TOOLS,
  geometryFromDrag,
  type EditorStore,
  type PinPathGeometry,
  type PinTool,
} from "../../application/document";
import type { Point } from "../../domain/paths";

interface ArcDraft {
  start: Point;
  end?: Point;
}

// Pin mode drawing (docs/specs/12-pin-drawing-tools, §14-arc-drawing-interaction):
// line (2 clicks), arc (3-stage), and the bounding-box/centre-radius drag tools all
// share one origin/commit state machine.
export function usePinDrawing(store: EditorStore, layerId: string) {
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [arcDraft, setArcDraft] = useState<ArcDraft | null>(null);

  function handleMouseDown(point: Point, pinTool: PinTool): void {
    if (pinTool === "line") {
      if (!dragStart) setDragStart(point);
      else {
        store.addPinPath(layerId, { type: "line", start: dragStart, end: point });
        setDragStart(null);
      }
      return;
    }

    if (pinTool === "arc") {
      if (!arcDraft) setArcDraft({ start: point });
      else if (!arcDraft.end) setArcDraft({ ...arcDraft, end: point });
      else {
        const curvature = curvatureFromCursor(arcDraft.start, arcDraft.end, point);
        store.addPinPath(layerId, { type: "arc", start: arcDraft.start, end: arcDraft.end, curvature });
        setArcDraft(null);
      }
      return;
    }

    if (DRAG_TOOLS.includes(pinTool)) setDragStart(point);
  }

  function handleMouseUp(point: Point, pinTool: PinTool, altHeld: boolean): void {
    if (!dragStart || !DRAG_TOOLS.includes(pinTool)) return;
    const geometry = geometryFromDrag(pinTool, dragStart, point, altHeld);
    if (geometry) store.addPinPath(layerId, geometry);
    setDragStart(null);
  }

  function previewGeometry(pinTool: PinTool, cursorDoc: Point | null, altHeld: boolean): PinPathGeometry | null {
    if (!cursorDoc) return null;
    if (pinTool === "line" && dragStart) return { type: "line", start: dragStart, end: cursorDoc };
    if (pinTool === "arc" && arcDraft?.end) {
      const curvature = curvatureFromCursor(arcDraft.start, arcDraft.end, cursorDoc);
      return { type: "arc", start: arcDraft.start, end: arcDraft.end, curvature };
    }
    if (pinTool === "arc" && arcDraft && !arcDraft.end) return { type: "line", start: arcDraft.start, end: cursorDoc };
    if (dragStart && DRAG_TOOLS.includes(pinTool)) return geometryFromDrag(pinTool, dragStart, cursorDoc, altHeld);
    return null;
  }

  return { handleMouseDown, handleMouseUp, previewGeometry };
}
