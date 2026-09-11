import {
  arcShape,
  circleShape,
  ellipseShape,
  freehandShape,
  lineShape,
  polygramShape,
  rectangleShape,
  regularPolygonShape,
  squareShape,
  starShape,
} from "../../domain/shapes";
import { distributeClosedPath, distributeOpenPath, distributePathPerVertex } from "../../domain/paths";
import type { Path, Point } from "../../domain/paths";
import { rotatePoint, translatePoint } from "../../domain/transforms";
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
  | { type: "polygram"; center: Point; radius: number; points: number; skip: number; rotation: number }
  | { type: "freehand"; points: Point[] };

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
    case "freehand":
      return freehandShape(geometry.points);
  }
}

// docs/specs/09-selection-and-editing.md Move tool — shifts every point field of a
// geometry by `delta`; `rotation` fields are translation-invariant, untouched.
export function translateGeometry(geometry: PinPathGeometry, delta: Point): PinPathGeometry {
  switch (geometry.type) {
    case "line":
    case "arc":
      return { ...geometry, start: translatePoint(geometry.start, delta), end: translatePoint(geometry.end, delta) };
    case "ellipse":
    case "circle":
    case "regular-polygon":
    case "star":
    case "polygram":
      return { ...geometry, center: translatePoint(geometry.center, delta) };
    case "rectangle":
    case "square":
      return { ...geometry, position: translatePoint(geometry.position, delta) };
    case "freehand":
      return { ...geometry, points: geometry.points.map((p) => translatePoint(p, delta)) };
  }
}

// docs/specs/09-selection-and-editing.md Rotation tool — rotates by `theta` radians
// about an ARBITRARY external pivot (wherever the user pressed down, not the shape's
// own center). Rectangle/square need special handling: `position` is always
// `center - halfSize` in the shape's UNROTATED local frame (rectangleShape derives
// center from position BEFORE applying `rotation`), so rotating `position` directly
// around an external pivot and separately bumping `rotation` would NOT keep
// `position + halfSize` equal to the correctly-rotated center. Instead: rotate the
// derived center about the pivot, then re-derive `position` from the new center using
// the same unrotated halfSize offset.
export function rotateGeometry(geometry: PinPathGeometry, pivot: Point, theta: number): PinPathGeometry {
  switch (geometry.type) {
    case "line":
    case "arc":
      return { ...geometry, start: rotatePoint(geometry.start, pivot, theta), end: rotatePoint(geometry.end, pivot, theta) };
    case "circle":
      // Rotationally symmetric about its own center; only the center needs to move.
      return { ...geometry, center: rotatePoint(geometry.center, pivot, theta) };
    case "ellipse":
    case "regular-polygon":
    case "star":
    case "polygram":
      return { ...geometry, center: rotatePoint(geometry.center, pivot, theta), rotation: geometry.rotation + theta };
    case "rectangle": {
      const halfW = geometry.width / 2;
      const halfH = geometry.height / 2;
      const oldCenter: Point = { x: geometry.position.x + halfW, y: geometry.position.y + halfH };
      const newCenter = rotatePoint(oldCenter, pivot, theta);
      return { ...geometry, position: { x: newCenter.x - halfW, y: newCenter.y - halfH }, rotation: geometry.rotation + theta };
    }
    case "square": {
      const half = geometry.side / 2;
      const oldCenter: Point = { x: geometry.position.x + half, y: geometry.position.y + half };
      const newCenter = rotatePoint(oldCenter, pivot, theta);
      return { ...geometry, position: { x: newCenter.x - half, y: newCenter.y - half }, rotation: geometry.rotation + theta };
    }
    case "freehand":
      return { ...geometry, points: geometry.points.map((p) => rotatePoint(p, pivot, theta)) };
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

// docs/specs/07-pin-geometry-engine.md §Continuous Pin Spacing Through Corners —
// carve-out: shapes whose guide *is* its vertices (a straight edge between two real
// corners) get a pin at every corner instead, with each edge's interior pins
// independently approximated to the requested spacing. Curved shapes (Arc/Circle/
// Ellipse) and Freehand (whose "vertices" are arbitrary sampled cursor points, not
// meaningful corners) keep the continuous whole-path distribution.
export const VERTEX_ANCHORED_TYPES = new Set<PinPathGeometry["type"]>(["line", "rectangle", "square", "regular-polygon", "star", "polygram"]);

export function isVertexAnchoredGeometry(type: PinPathGeometry["type"]): boolean {
  return VERTEX_ANCHORED_TYPES.has(type);
}

export function distributePins(geometry: PinPathGeometry, requestedSpacing: number): { pins: Pin[]; actualSpacing: number } {
  const path = geometryToPath(geometry);
  if (isVertexAnchoredGeometry(geometry.type)) {
    const { points, actualSpacing } = distributePathPerVertex(path, requestedSpacing);
    return { pins: points.map((p) => ({ id: nextPinId(), ...p })), actualSpacing };
  }
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
