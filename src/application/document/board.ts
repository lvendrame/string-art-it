import {
  circleShape,
  ellipseShape,
  equilateralTriangleShape,
  rectangleShape,
  rightTriangleHypotenuse,
  rightTriangleShape,
  squareShape,
} from "../../domain/shapes";
import type { Path } from "../../domain/paths";

// docs/specs/03-board-configuration.md
export type BoardShape = "circle" | "oval" | "rectangle" | "square" | "triangle";
export type TriangleType = "equilateral" | "right-angled";

export interface BoardDimensions {
  diameter?: number;
  width?: number;
  height?: number;
  side?: number;
  base?: number;
}

// docs/specs/04-board-appearance.md
export type BoardAppearance =
  | { type: "solid"; colour: string }
  | { type: "linear-gradient"; stops: { offset: number; colour: string }[]; direction: number }
  | { type: "radial-gradient"; stops: { offset: number; colour: string }[]; centre: { x: number; y: number } }
  | { type: "wood-texture"; presetId: string }
  | { type: "painted-wood"; presetId: string }
  // docs/specs §00 Phase 2 "uploaded board textures" — no asset backend exists, so the
  // uploaded image is stored directly as a data URL (fine at this scale; a real asset
  // store would matter once boards are shared between documents).
  | { type: "custom-texture"; imageDataUrl: string };

export interface Board {
  shape: BoardShape;
  triangleType?: TriangleType;
  dimensions: BoardDimensions;
  appearance: BoardAppearance;
}

const MIN_DIMENSION = 0.1;

export function clampDimension(value: number): number {
  return Number.isFinite(value) && value > MIN_DIMENSION ? value : MIN_DIMENSION;
}

export function createDefaultBoard(): Board {
  return {
    shape: "circle",
    dimensions: { diameter: 60 },
    appearance: { type: "painted-wood", presetId: "walnut" },
  };
}

// Default dimensions applied when switching shape/triangle-type so the UI never shows
// a stale field bleeding across shapes (docs/specs §03 "switching triangle type clears
// the other type's fields").
export function defaultDimensionsFor(shape: BoardShape, triangleType?: TriangleType): BoardDimensions {
  switch (shape) {
    case "circle":
      return { diameter: 60 };
    case "oval":
      return { width: 60, height: 40 };
    case "rectangle":
      return { width: 60, height: 40 };
    case "square":
      return { side: 50 };
    case "triangle":
      return triangleType === "right-angled" ? { base: 40, height: 30 } : { side: 50 };
  }
}

export function boardHypotenuse(board: Board): number | null {
  if (board.shape === "triangle" && board.triangleType === "right-angled") {
    const { base = 0, height = 0 } = board.dimensions;
    return rightTriangleHypotenuse(base, height);
  }
  return null;
}

// Board geometry is always centred on the document origin at this stage — repositioning
// the board itself is not in scope for MVP (docs/specs §00 MVP Scope).
export function boardPath(board: Board): Path {
  const d = board.dimensions;
  switch (board.shape) {
    case "circle":
      return circleShape({ x: 0, y: 0 }, (d.diameter ?? 60) / 2);
    case "oval":
      return ellipseShape({ x: 0, y: 0 }, (d.width ?? 60) / 2, (d.height ?? 40) / 2);
    case "rectangle": {
      const w = d.width ?? 60;
      const h = d.height ?? 40;
      return rectangleShape({ x: -w / 2, y: -h / 2 }, w, h);
    }
    case "square": {
      const s = d.side ?? 50;
      return squareShape({ x: -s / 2, y: -s / 2 }, s);
    }
    case "triangle":
      if (board.triangleType === "right-angled") {
        const base = d.base ?? 40;
        const height = d.height ?? 30;
        return rightTriangleShape({ x: -base / 2, y: -height / 2 }, base, height);
      }
      return equilateralTriangleShape({ x: 0, y: 0 }, d.side ?? 50);
  }
}
