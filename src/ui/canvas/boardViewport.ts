import { boardPath, type Board } from "../../application/document";
import { pathBoundingBoxPoints } from "../../domain/paths";
import { boundingBoxOf, fitToViewport, type Viewport } from "../../domain/transforms";

export const CANVAS_VIEWPORT_PX = { width: 720, height: 640 };

const BOARD_MARGIN_CM = 5;
const FIT_PADDING_PX = 20;

export function fitViewportForBoard(board: Board): Viewport {
  const box = boundingBoxOf(pathBoundingBoxPoints(boardPath(board)));
  const padded = {
    minX: box.minX - BOARD_MARGIN_CM,
    minY: box.minY - BOARD_MARGIN_CM,
    maxX: box.maxX + BOARD_MARGIN_CM,
    maxY: box.maxY + BOARD_MARGIN_CM,
  };
  return fitToViewport(padded, CANVAS_VIEWPORT_PX, FIT_PADDING_PX);
}
