// Core geometry vocabulary shared by every shape (docs/specs/07-pin-geometry-engine.md
// §Geometry Engine Responsibilities). A Path is a sequence of Segments walked as one
// continuous distance axis — this is what makes corner-crossing spacing (§20) trivial:
// callers never need to know where one segment ends and the next begins.
export interface Point {
  x: number;
  y: number;
}

export interface Segment {
  length(): number;
  // distance is measured from the start of THIS segment, in [0, length()].
  pointAtDistance(distance: number): Point;
}

export interface Path {
  segments: Segment[];
  closed: boolean;
}
