import { boardPath, type Board } from "@application/document";
import { pathBoundingBoxPoints } from "@domain/paths";
import { boundingBoxOf, fitToViewport, type Viewport } from "@domain/transforms";
import { getCanvasViewportSize, type ViewportSize } from "./canvasViewportSize";

const BOARD_MARGIN_CM = 5;
const FIT_PADDING_PX = 20;

export function fitViewportForBoard(board: Board, viewportPx: ViewportSize = getCanvasViewportSize()): Viewport {
  const box = boundingBoxOf(pathBoundingBoxPoints(boardPath(board)));
  const padded = {
    minX: box.minX - BOARD_MARGIN_CM,
    minY: box.minY - BOARD_MARGIN_CM,
    maxX: box.maxX + BOARD_MARGIN_CM,
    maxY: box.maxY + BOARD_MARGIN_CM,
  };
  return fitToViewport(padded, viewportPx, FIT_PADDING_PX);
}
