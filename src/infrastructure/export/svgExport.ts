import {
  boardPath,
  geometryCenter,
  geometryToContourPaths,
  type Board,
  type PinLayer,
  type PrintElements,
  type ThreadLayer,
} from "../../application/document";
import { pathBoundingBoxPoints, type Point } from "../../domain/paths";
import { boundingBoxOf } from "../../domain/transforms";
import { boardFillDefsMarkup, boardFillPaint } from "../rendering/boardFillUtils";
import { pathToSvgD } from "../rendering/svgPath";

export interface ExportDocument {
  board: Board;
  pinLayers: PinLayer[];
  threadLayers: ThreadLayer[];
}

const MARGIN_CM = 2;
const PIN_DOT_RADIUS_CM = 0.06;
const PIN_NUMBER_FONT_CM = 0.2;
const PIN_NUMBER_GAP_CM = 0.08;
// Centered (text-anchor/dominant-baseline "middle") on the offset point, so the
// label's near edge — not its center — needs to clear the dot.
const PIN_NUMBER_OFFSET_CM = PIN_DOT_RADIUS_CM + PIN_NUMBER_FONT_CM / 2 + PIN_NUMBER_GAP_CM;

// docs/specs/15-export.md — a pure radial-from-centre offset keeps numbers outside
// round/star-like closed shapes, but for straight runs of collinear pins (Line,
// Rectangle/Square edges, Freehand wherever it's locally straight or coils tight)
// the centre-to-pin ray points ALONG the path, landing the label on the next pin
// instead of beside its own. Use the local outward NORMAL instead — perpendicular
// to the path's tangent at that pin (from its neighbours in the already-ordered
// `pins` array), oriented away from the shape's centre — which reduces to the same
// radial offset for circles/ellipses/polygons and fixes the collinear cases too.
function pinLabelPosition(
  pin: Point,
  prev: Point | null,
  next: Point | null,
  center: Point,
  offsetCm: number,
): Point {
  const tx = (next?.x ?? pin.x) - (prev?.x ?? pin.x);
  const ty = (next?.y ?? pin.y) - (prev?.y ?? pin.y);
  const tlen = Math.hypot(tx, ty);
  let nx: number, ny: number;
  if (tlen > 1e-6) {
    nx = -ty / tlen;
    ny = tx / tlen;
    const toPinX = pin.x - center.x;
    const toPinY = pin.y - center.y;
    if (nx * toPinX + ny * toPinY < 0) {
      nx = -nx;
      ny = -ny;
    }
  } else {
    const dx = pin.x - center.x;
    const dy = pin.y - center.y;
    const dist = Math.hypot(dx, dy);
    [nx, ny] = dist > 1e-6 ? [dx / dist, dy / dist] : [0, -1];
  }
  return { x: pin.x + nx * offsetCm, y: pin.y + ny * offsetCm };
}

function pinLabelPositions(pins: Point[], closed: boolean, center: Point, offsetCm: number): Point[] {
  const n = pins.length;
  return pins.map((pin, i) => {
    const prev = closed ? pins[(i - 1 + n) % n] : (pins[i - 1] ?? null);
    const next = closed ? pins[(i + 1) % n] : (pins[i + 1] ?? null);
    return pinLabelPosition(pin, prev, next, center, offsetCm);
  });
}

// Shared by static SVG/PDF/PNG export and the Play-mode video exporter (docs/specs/
// 19-play-mode.md), so both size their output from the same board bounding box.
export function exportBoundingBox(board: Board): { minX: number; minY: number; width: number; height: number } {
  const path = boardPath(board);
  const box = boundingBoxOf(pathBoundingBoxPoints(path));
  return {
    minX: box.minX - MARGIN_CM,
    minY: box.minY - MARGIN_CM,
    width: box.maxX - box.minX + MARGIN_CM * 2,
    height: box.maxY - box.minY + MARGIN_CM * 2,
  };
}

// docs/specs/15-export.md "SVG and PDF should preserve vector geometry wherever
// possible" — every shape here is a real SVG path/circle element at true physical
// size (1 user unit = 1 cm), never a rasterized approximation. This is the one place
// document state becomes export markup; the Editor/Print renderers are separate
// consumers of the same domain geometry (docs/specs/01-architecture.md).
export function buildExportSvg(doc: ExportDocument, elements: PrintElements): string {
  const { minX, minY, width, height } = exportBoundingBox(doc.board);

  const defs: string[] = [];
  const content: string[] = [];

  if (elements.background) {
    defs.push(boardFillDefsMarkup("export-fill", doc.board.appearance));
  }
  if (elements.boardOutline) {
    const fill = elements.background ? boardFillPaint("export-fill", doc.board.appearance) : "none";
    content.push(`<path d="${pathToSvgD(boardPath(doc.board))}" fill="${fill}" stroke="black" stroke-width="0.05"/>`);
  }

  for (const layer of doc.pinLayers) {
    if (!layer.visible) continue;
    for (const p of layer.pinPaths) {
      if (elements.pinGuides) {
        const d = geometryToContourPaths(p.geometry).map(pathToSvgD).join(" ");
        content.push(`<path d="${d}" fill="none" stroke="black" stroke-opacity="0.8" stroke-width="0.03" stroke-dasharray="0.15 0.1"/>`);
      }
      if (elements.pins) {
        const center = geometryCenter(p.geometry);
        // A Text Pin Path is N independent closed contours — treat it as closed for
        // label placement, same as Circle/Ellipse (see PrintPreviewPanel.tsx's
        // identical rule).
        const closed = p.geometry.type === "text" ? true : geometryToContourPaths(p.geometry)[0].closed;
        const labelPositions = pinLabelPositions(p.pins, closed, center, PIN_NUMBER_OFFSET_CM);
        p.pins.forEach((pin, i) => {
          content.push(`<circle cx="${pin.x}" cy="${pin.y}" r="${PIN_DOT_RADIUS_CM}" fill="${p.colour}" stroke="#1b1b1b" stroke-width="0.015"/>`);
          if (elements.pinNumbers) {
            const labelPos = labelPositions[i];
            content.push(`<text x="${labelPos.x}" y="${labelPos.y}" text-anchor="middle" dominant-baseline="middle" font-size="${PIN_NUMBER_FONT_CM}" fill="black">${i + 1}</text>`);
          }
        });
      }
    }
  }

  if (elements.threads) {
    const findPin = (id: string) => doc.pinLayers.flatMap((l) => l.pinPaths).flatMap((p) => p.pins).find((p) => p.id === id);
    for (const layer of doc.threadLayers) {
      if (!layer.visible) continue;
      for (const t of layer.threadPaths) {
        const points = t.pinIds.map(findPin).filter((p): p is NonNullable<typeof p> => !!p);
        if (points.length < 2) continue;
        const d = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
        content.push(`<path d="${d}" fill="none" stroke="${t.colours[0]}" stroke-width="${t.width * 0.1}"/>`);
      }
    }
  }

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}cm" height="${height}cm" viewBox="${minX} ${minY} ${width} ${height}">`,
    `<defs>${defs.join("")}</defs>`,
    ...content,
    `</svg>`,
  ].join("\n");
}
