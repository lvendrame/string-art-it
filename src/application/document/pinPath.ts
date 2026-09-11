import {
  arcShape,
  circleShape,
  ellipseShape,
  lineShape,
  polygramShape,
  rectangleShape,
  regularPolygonShape,
  squareShape,
  starShape,
} from "../../domain/shapes";
import { distributeClosedPath, distributeOpenPath } from "../../domain/paths";
import type { Path, Point } from "../../domain/paths";
import { NO_SYMMETRY, type SymmetryConfig } from "./symmetryConfig";
import { nextId } from "./idCounter";

// docs/specs/08-pin-tools-and-properties.md §Pin Drawing Tools
export type PinPathGeometry =
  | { type: "line"; start: Point; end: Point }
  | { type: "arc"; start: Point; end: Point; curvature: number }
  | { type: "ellipse"; center: Point; radiusX: number; radiusY: number; rotation: number }
  | { type: "circle"; center: Point; radius: number }
  | { type: "rectangle"; position: Point; width: number; height: number; rotation: number }
  | { type: "square"; position: Point; side: number; rotation: number }
  | { type: "regular-polygon"; center: Point; radius: number; sides: number; rotation: number }
  | { type: "star"; center: Point; outerRadius: number; innerRadius: number; points: number; rotation: number }
  | { type: "polygram"; center: Point; radius: number; points: number; skip: number; rotation: number };

export function geometryToPath(geometry: PinPathGeometry): Path {
  switch (geometry.type) {
    case "line":
      return lineShape(geometry.start, geometry.end);
    case "arc":
      return arcShape(geometry.start, geometry.end, geometry.curvature);
    case "ellipse":
      return ellipseShape(geometry.center, geometry.radiusX, geometry.radiusY, geometry.rotation);
    case "circle":
      return circleShape(geometry.center, geometry.radius);
    case "rectangle":
      return rectangleShape(geometry.position, geometry.width, geometry.height, geometry.rotation);
    case "square":
      return squareShape(geometry.position, geometry.side, geometry.rotation);
    case "regular-polygon":
      return regularPolygonShape(geometry.center, geometry.radius, geometry.sides, geometry.rotation);
    case "star":
      return starShape(geometry.center, geometry.outerRadius, geometry.innerRadius, geometry.points, geometry.rotation);
    case "polygram":
      return polygramShape(geometry.center, geometry.radius, geometry.points, geometry.skip, geometry.rotation);
  }
}

export interface Pin {
  id: string;
  x: number;
  y: number;
}

export interface PinStyle {
  colour: string;
  diameter: number;
  guideVisible: boolean;
}

export interface PinPath {
  id: string;
  geometry: PinPathGeometry;
  requestedSpacing: number;
  actualSpacing: number;
  pins: Pin[];
  guideVisible: boolean;
  colour: string;
  diameter: number;
  symmetry: SymmetryConfig;
}

export function nextPinId(): string {
  return nextId("pin");
}

function nextPathId(): string {
  return nextId("pinpath");
}

// docs/specs/13-layers.md "Duplicated pins do not inherit existing thread
// connections" — fresh pin IDs are the whole mechanism: existing Thread Paths keep
// referencing the ORIGINAL pin IDs, which still exist on the source layer untouched.
export function clonePinPath(path: PinPath): PinPath {
  return { ...path, id: nextPathId(), pins: path.pins.map((p) => ({ ...p, id: nextPinId() })) };
}

export function distributePins(geometry: PinPathGeometry, requestedSpacing: number): { pins: Pin[]; actualSpacing: number } {
  const path = geometryToPath(geometry);
  if (path.closed) {
    const { points, actualSpacing } = distributeClosedPath(path, requestedSpacing);
    return { pins: points.map((p) => ({ id: nextPinId(), ...p })), actualSpacing };
  }
  const points = distributeOpenPath(path, requestedSpacing);
  return { pins: points.map((p) => ({ id: nextPinId(), ...p })), actualSpacing: requestedSpacing };
}

export function createPinPath(
  geometry: PinPathGeometry,
  requestedSpacing: number,
  style: PinStyle,
  symmetry: SymmetryConfig = NO_SYMMETRY,
): PinPath {
  const { pins, actualSpacing } = distributePins(geometry, requestedSpacing);
  return {
    id: nextPathId(),
    geometry,
    requestedSpacing,
    actualSpacing,
    pins,
    guideVisible: style.guideVisible,
    colour: style.colour,
    diameter: style.diameter,
    symmetry,
  };
}

// Any geometry or spacing edit recalculates pins (docs/specs/09-selection-and-editing.md).
export function recomputePinPath(pinPath: PinPath): PinPath {
  const { pins, actualSpacing } = distributePins(pinPath.geometry, pinPath.requestedSpacing);
  return { ...pinPath, pins, actualSpacing };
}
