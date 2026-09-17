import {
  arcShape,
  circleShape,
  closedPolylineShape,
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
import { rotatePoint, scalePoint, translatePoint } from "../../domain/transforms";
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
  | { type: "freehand"; points: Point[] }
  // docs/specs/29-text-pin-path.md. `contours` is a DERIVED CACHE — the flattened, already
  // font-resolved+positioned outline points (one array per closed loop; a hole letter like
  // "o" or a disconnected piece like "i"'s dot contributes more than one), the same way
  // pins[] is a derived cache of geometry+spacing for every other shape. It is produced by
  // the UI layer (the only layer that talks to opentype.js — see
  // src/infrastructure/fonts/) whenever text/fontId/weight/italic/size/letterSpacing
  // changes, and is what keeps this application layer infra-free: distributePins/
  // geometryToContourPaths below only ever consume already-flattened points, never fonts.
  | {
      type: "text";
      origin: Point;
      text: string;
      fontId: string;
      weight: "regular" | "bold";
      italic: boolean;
      size: number;
      letterSpacing: number;
      rotation: number;
      contours: Point[][];
    };

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
    case "text":
      // Text has no single continuous Path — it's N closed contours (see the "text"
      // PinPathGeometry variant's doc comment above). Callers that need geometry as
      // Path(s) — distribution, rendering — must use geometryToContourPaths instead.
      throw new Error("geometryToPath does not support \"text\" geometry — use geometryToContourPaths");
  }
}

// The general form: every shape as a list of Path contours. For the 10 single-contour
// shapes this is just [geometryToPath(geometry)]; for "text" it's one closed
// closedPolylineShape per already-flattened contour. distributePins and the guide-line
// renderer (PinPathVisual.tsx) both use this instead of geometryToPath so multi-contour
// shapes (a letter's ring + its hole) work with zero shape-specific code in either place.
export function geometryToContourPaths(geometry: PinPathGeometry): Path[] {
  if (geometry.type === "text") return geometry.contours.map(closedPolylineShape);
  return [geometryToPath(geometry)];
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
    case "text":
      // Same treatment as freehand: contours are absolute points, so Move just shifts
      // every one of them (plus origin, kept in sync purely for display/re-editing).
      return {
        ...geometry,
        origin: translatePoint(geometry.origin, delta),
        contours: geometry.contours.map((c) => c.map((p) => translatePoint(p, delta))),
      };
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
    case "text":
      // Same treatment as freehand: rotate the baked contour points directly rather
      // than re-laying-out the font at an angle. Scope note (docs/specs/29-text-pin-
      // path.md): if the text/font/size/weight/italic/letterSpacing is edited again
      // after this, contours are regenerated from scratch at the field's literal
      // (unrotated) values — same "typed edit regenerates, manual transform doesn't
      // survive" precedent as Pin Eraser vs. geometry edits elsewhere in this file.
      return {
        ...geometry,
        origin: rotatePoint(geometry.origin, pivot, theta),
        rotation: geometry.rotation + theta,
        contours: geometry.contours.map((c) => c.map((p) => rotatePoint(p, pivot, theta))),
      };
  }
}

// docs/specs/21-scale-and-pin-distance.md Scale tool — the shape's own centroid,
// invariant under scaling (the pivot IS the centre, so only size fields move).
// Also the pivot for docs/specs/23-keyboard-transform.md's keyboard Rotate/Scale.
export function geometryCenter(geometry: PinPathGeometry): Point {
  switch (geometry.type) {
    case "line":
    case "arc":
      return { x: (geometry.start.x + geometry.end.x) / 2, y: (geometry.start.y + geometry.end.y) / 2 };
    case "ellipse":
    case "circle":
    case "regular-polygon":
    case "star":
    case "polygram":
      return geometry.center;
    case "rectangle":
      return { x: geometry.position.x + geometry.width / 2, y: geometry.position.y + geometry.height / 2 };
    case "square":
      return { x: geometry.position.x + geometry.side / 2, y: geometry.position.y + geometry.side / 2 };
    case "freehand": {
      const pts = geometry.points;
      return { x: pts.reduce((s, p) => s + p.x, 0) / pts.length, y: pts.reduce((s, p) => s + p.y, 0) / pts.length };
    }
    case "text": {
      // Same "arithmetic mean of all points" rule as freehand — the one existing
      // precedent for a shape defined by an arbitrary point cloud rather than a
      // parametric centre/position field.
      const pts = geometry.contours.flat();
      if (pts.length === 0) return geometry.origin;
      return { x: pts.reduce((s, p) => s + p.x, 0) / pts.length, y: pts.reduce((s, p) => s + p.y, 0) / pts.length };
    }
  }
}

// docs/specs/21-scale-and-pin-distance.md Scale tool — resizes about the shape's own
// centroid (never an external pivot like Rotation), so the centroid stays fixed and
// only size fields change. Arc's `curvature` is a physical sagitta length (see
// domain/shapes/arc.ts), so it scales with the shape like any other length field.
export function scaleGeometry(geometry: PinPathGeometry, factor: number): PinPathGeometry {
  return scaleGeometryAboutPivot(geometry, geometryCenter(geometry), factor);
}

// docs/specs/26-edit-mode-multi-select.md — the general form of Scale, about an
// ARBITRARY pivot rather than necessarily the shape's own centroid. Single-path Scale
// (docs/specs/21-scale-and-pin-distance.md) is the special case `scaleGeometry` above
// calls this with (pivot = geometryCenter); multi-path Scale passes the shared
// selection centroid instead, so every selected path scales about the same point.
export function scaleGeometryAboutPivot(geometry: PinPathGeometry, pivot: Point, factor: number): PinPathGeometry {
  switch (geometry.type) {
    case "line":
      return { ...geometry, start: scalePoint(geometry.start, pivot, factor), end: scalePoint(geometry.end, pivot, factor) };
    case "arc":
      return {
        ...geometry,
        start: scalePoint(geometry.start, pivot, factor),
        end: scalePoint(geometry.end, pivot, factor),
        curvature: geometry.curvature * factor,
      };
    case "circle":
      return { ...geometry, center: scalePoint(geometry.center, pivot, factor), radius: geometry.radius * factor };
    case "ellipse":
      return {
        ...geometry,
        center: scalePoint(geometry.center, pivot, factor),
        radiusX: geometry.radiusX * factor,
        radiusY: geometry.radiusY * factor,
      };
    case "rectangle": {
      const width = geometry.width * factor;
      const height = geometry.height * factor;
      const oldCenter: Point = { x: geometry.position.x + geometry.width / 2, y: geometry.position.y + geometry.height / 2 };
      const newCenter = scalePoint(oldCenter, pivot, factor);
      return { ...geometry, width, height, position: { x: newCenter.x - width / 2, y: newCenter.y - height / 2 } };
    }
    case "square": {
      const side = geometry.side * factor;
      const oldSide = geometry.side;
      const oldCenter: Point = { x: geometry.position.x + oldSide / 2, y: geometry.position.y + oldSide / 2 };
      const newCenter = scalePoint(oldCenter, pivot, factor);
      return { ...geometry, side, position: { x: newCenter.x - side / 2, y: newCenter.y - side / 2 } };
    }
    case "regular-polygon":
      return { ...geometry, center: scalePoint(geometry.center, pivot, factor), radius: geometry.radius * factor };
    case "star":
      return {
        ...geometry,
        center: scalePoint(geometry.center, pivot, factor),
        outerRadius: geometry.outerRadius * factor,
        innerRadius: geometry.innerRadius * factor,
      };
    case "polygram":
      return { ...geometry, center: scalePoint(geometry.center, pivot, factor), radius: geometry.radius * factor };
    case "freehand":
      return { ...geometry, points: geometry.points.map((p) => scalePoint(p, pivot, factor)) };
    case "text":
      // Same treatment as freehand/rotate above: scale the baked contour points
      // directly (font size itself is left untouched — see this variant's rotate case
      // for the "regenerates on next text edit" scope note, which applies here too).
      return {
        ...geometry,
        origin: scalePoint(geometry.origin, pivot, factor),
        contours: geometry.contours.map((c) => c.map((p) => scalePoint(p, pivot, factor))),
      };
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

// Exported alongside nextPinId for the same reason (docs/specs/32-generator-mode.md):
// callers that construct a PinPath's pins directly instead of through distributePins —
// currently only the Spirals generator pattern, whose pins are exact parametric-curve
// samples that arc-length resampling would silently move — still need real, correctly-
// prefixed ids.
export function nextPathId(): string {
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
  // docs/specs/29-text-pin-path.md §Multi-contour closed-path distribution — a glyph
  // contour is a compound curved path (flattened from Bezier curves), not a shape
  // defined by real straight-edge vertices, so it gets the SAME closed-path continuous-
  // accumulation rule as Circle/Ellipse (docs/specs/07-pin-geometry-engine.md), just run
  // independently per contour instead of once over a single path — a letter's ring and
  // its hole are two unrelated perimeters, each uniformly spaced on its own. `pins[]` is
  // the flat concatenation across every contour, same shape as every other Pin Path;
  // `actualSpacing` reports the first contour's value as a representative summary, the
  // same "one number even though it varies per piece" precedent distributePathPerVertex
  // already uses for per-edge shapes.
  if (geometry.type === "text") {
    const pins: Pin[] = [];
    let actualSpacing = requestedSpacing;
    geometry.contours.forEach((contourPoints, i) => {
      if (contourPoints.length < 2) return; // degenerate contour — no meaningful perimeter
      const contourPath = closedPolylineShape(contourPoints);
      const { points, actualSpacing: contourSpacing } = distributeClosedPath(contourPath, requestedSpacing);
      if (i === 0) actualSpacing = contourSpacing;
      points.forEach((p) => pins.push({ id: nextPinId(), ...p }));
    });
    return { pins, actualSpacing };
  }

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
