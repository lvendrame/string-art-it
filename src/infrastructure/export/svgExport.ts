import {
  boardPath,
  geometryToPath,
  type Board,
  type PinLayer,
  type PrintElements,
  type ThreadLayer,
} from "../../application/document";
import { pathBoundingBoxPoints } from "../../domain/paths";
import { boundingBoxOf } from "../../domain/transforms";
import { boardFillDefsMarkup, boardFillPaint } from "../rendering/boardFill";
import { pathToSvgD } from "../rendering/svgPath";

export interface ExportDocument {
  board: Board;
  pinLayers: PinLayer[];
  threadLayers: ThreadLayer[];
}

const MARGIN_CM = 2;

// docs/specs/15-export.md "SVG and PDF should preserve vector geometry wherever
// possible" — every shape here is a real SVG path/circle element at true physical
// size (1 user unit = 1 cm), never a rasterized approximation. This is the one place
// document state becomes export markup; the Editor/Print renderers are separate
// consumers of the same domain geometry (docs/specs/01-architecture.md).
export function buildExportSvg(doc: ExportDocument, elements: PrintElements): string {
  const path = boardPath(doc.board);
  const box = boundingBoxOf(pathBoundingBoxPoints(path));
  const minX = box.minX - MARGIN_CM;
  const minY = box.minY - MARGIN_CM;
  const width = box.maxX - box.minX + MARGIN_CM * 2;
  const height = box.maxY - box.minY + MARGIN_CM * 2;

  const defs: string[] = [];
  const content: string[] = [];

  if (elements.background) {
    defs.push(boardFillDefsMarkup("export-fill", doc.board.appearance));
  }
  if (elements.boardOutline) {
    const fill = elements.background ? boardFillPaint("export-fill", doc.board.appearance) : "none";
    content.push(`<path d="${pathToSvgD(path)}" fill="${fill}" stroke="black" stroke-width="0.05"/>`);
  }

  for (const layer of doc.pinLayers) {
    if (!layer.visible) continue;
    for (const p of layer.pinPaths) {
      if (elements.pinGuides) {
        content.push(`<path d="${pathToSvgD(geometryToPath(p.geometry))}" fill="none" stroke="black" stroke-opacity="0.8" stroke-width="0.03" stroke-dasharray="0.15 0.1"/>`);
      }
      if (elements.pins) {
        p.pins.forEach((pin, i) => {
          content.push(`<circle cx="${pin.x}" cy="${pin.y}" r="0.06" fill="${p.colour}" stroke="#1b1b1b" stroke-width="0.015"/>`);
          if (elements.pinNumbers) {
            content.push(`<text x="${pin.x + 0.1}" y="${pin.y - 0.1}" font-size="0.15" fill="black">${i + 1}</text>`);
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
