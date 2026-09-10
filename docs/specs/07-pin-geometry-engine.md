# 07 — Pin Geometry Engine

## Purpose

Define the mathematically precise algorithms that turn a geometric path into a set of pins: open-path distribution, closed-path uniform distribution, continuous spacing through corners, and the precision/performance requirements on the underlying Geometry Engine (see [01-architecture.md](./01-architecture.md) for layer boundaries).

## Open-Path Pin Distribution

For open paths (Line, Arc, non-closed compound paths):

```text
L = path length
D = requested pin spacing
```

Pins occur at:

```text
0
D
2D
3D
...
floor(L / D) × D
```

Pin count:

```text
floor(L / D) + 1
```

The endpoint is **not** artificially forced to contain a pin — any residual distance less than `D` after the last pin remains empty.

### Examples

```text
Length = 8 cm, Spacing = 1 cm
Pins at: 0 1 2 3 4 5 6 7 8
Result: 9 pins
```

```text
Length = 7.5 cm, Spacing = 1 cm
Pins at: 0 1 2 3 4 5 6 7
Result: 8 pins (last 0.5 cm remains empty)
```

## Closed-Path Pin Distribution

Closed paths include: Circle, Ellipse, Rectangle, Square, Pentagon, Hexagon, Octagon, Stars, Polygrams, and any other closed path.

Closed shapes require **uniform pin spacing around the complete perimeter** — there must never be a small residual closing gap.

### Closed-Path Pin Count Algorithm

> Choose the integer pin count that produces an actual uniform spacing closest to the requested spacing.

```text
P = total perimeter
D = requested spacing

N ≈ P / D                    // approximate interval count

Evaluate nearby integer candidates for N.
actualSpacing(N) = P / N

Choose N that minimizes:
  | actualSpacing(N) - D |
```

The number of physical pins for a closed path equals the number of intervals `N` — the start/end coordinate is a single shared pin, so there is no duplicate.

### Example

```text
Perimeter = 31 cm
Requested spacing = 2 cm

Approximate interval count: 31 / 2 = 15.5

15 intervals → 31 / 15 = 2.0667 cm   (diff from 2 cm: 0.0667 cm)
16 intervals → 31 / 16 = 1.9375 cm   (diff from 2 cm: 0.0625 cm)

Chosen: 16 intervals → 16 pins, actual spacing 1.9375 cm
```

The application must expose this result to the user (see live preview below and [05-canvas-and-viewport.md](./05-canvas-and-viewport.md) status bar).

## Continuous Pin Spacing Through Corners

Rectangles, polygons, stars, and other compound closed shapes are treated as **one continuous geometric path**. Spacing does not restart on each edge.

```text
Edge 1
   ↓
─────────┐
         │
         │ Edge 2
         │
```

If the next pin falls 2 mm after a corner, it is positioned 2 mm into the next edge. Distance accumulation continues through every corner without resetting.

This applies identically to both the open-path algorithm (accumulate along the full compound path) and the closed-path algorithm (perimeter `P` is the sum of all edge/arc lengths, and pin placement walks continuously across corners).

## Live Preview Values

While creating or resizing a Pin Path, the editor displays live values that update whenever shape dimensions, rotation, curvature, or requested spacing change.

**Open path:**
```text
Length:          37.4 cm
Requested gap:    1.0 cm
Pins:            38
```

**Closed path:**
```text
Perimeter:        37.4 cm
Requested gap:     1.0 cm
Actual gap:        1.01 cm
Pins:             37
```

The closed-shape preview is always geometrically closed (no visual gap), even while the shape is still being dragged/resized.

## Geometry Precision

Geometry must use mathematical paths rather than screen-pixel approximation:

- Circle → true circumference
- Arc → true arc length
- Ellipse → accurate numerical path length (no closed-form solution — approximate numerically, e.g. via elliptic integral approximation or adaptive numerical integration, to a defined error tolerance)
- Rectangle → continuous perimeter
- Polygon → continuous edge path
- Stars → continuous geometric path
- Polygrams → correct self-intersecting geometric path (perimeter follows the star-polygon's actual traversal, not its convex hull)

## Geometry Engine Responsibilities (Pin-Generation Scope)

- Path length computation for every supported shape type
- Point-at-distance (given a path and a distance along it, return the point — used by both distribution algorithms)
- Open pin distribution
- Closed pin distribution / spacing optimization
- Continuous accumulation across corners
- Bounding boxes, rotation, transformation (needed to recompute geometry on edit — see [09-selection-and-editing.md](./09-selection-and-editing.md))

## Performance

Nearest-pin detection (used heavily by Thread mode, [12-thread-editor.md](./12-thread-editor.md)) should eventually use a spatial index instead of checking every pin on every pointer-move event. Acceptable implementations: spatial hash, quadtree, R-tree, k-d tree. Exact implementation is not prescribed — this is a non-functional requirement to design the pin-storage/query interface so a spatial index can be introduced later without changing calling code.

## Test Cases

```gherkin
Feature: Open-path pin distribution

  Scenario: Exact division produces pins including both endpoints
    Given an open path of length 8 cm
    And requested spacing 1 cm
    When pins are distributed
    Then pins are placed at 0,1,2,3,4,5,6,7,8 cm
    And the pin count is 9

  Scenario: Non-exact division leaves a residual gap and does not force an endpoint pin
    Given an open path of length 7.5 cm
    And requested spacing 1 cm
    When pins are distributed
    Then pins are placed at 0,1,2,3,4,5,6,7 cm
    And the pin count is 8
    And no pin is placed at 7.5 cm

  Scenario: Spacing larger than path length still places the start pin
    Given an open path of length 0.5 cm
    And requested spacing 5 cm
    When pins are distributed
    Then exactly 1 pin is placed, at position 0

  Scenario: Very small path with very small spacing
    Given an open path of length 0.01 cm
    And requested spacing 0.001 cm
    When pins are distributed
    Then the pin count equals floor(0.01/0.001) + 1 = 11
    And floating-point rounding does not produce 10 or 12 pins

Feature: Closed-path uniform pin distribution

  Scenario: Perimeter divides the requested spacing to the closer candidate (31/2 example)
    Given a closed path with perimeter 31 cm
    And requested spacing 2 cm
    When pins are distributed
    Then the interval count chosen is 16
    And the actual spacing is 1.9375 cm
    And the pin count is 16

  Scenario: Exact closed division produces no rounding artifact
    Given a closed path with perimeter 30 cm
    And requested spacing 3 cm
    When pins are distributed
    Then the interval count chosen is 10
    And the actual spacing is exactly 3 cm
    And the pin count is 10

  Scenario: No duplicate pin at the start/end seam
    Given any closed path with pins distributed
    Then the pin at cumulative distance 0 and the pin at cumulative distance P are the same single pin, not two coincident pins

  Scenario: Closed path chooses the closer of two candidate spacings deterministically
    Given a closed path with perimeter 100 cm
    And requested spacing 7 cm
    When comparing interval counts 14 (spacing 7.143 cm) and 15 (spacing 6.667 cm)
    Then interval count 14 is chosen because |7.143-7| < |6.667-7|

  Scenario: Spacing request larger than perimeter still yields a minimum valid closed shape
    Given a closed path with perimeter 5 cm
    And requested spacing 20 cm
    When pins are distributed
    Then the algorithm chooses interval count 1
    And the pin count is 1 (a single pin placed at the path start)

Feature: Continuous spacing through corners

  Scenario: Spacing carries over across a rectangle corner
    Given a rectangle with edge 1 length 10 cm and edge 2 length 10 cm (adjacent, sharing a corner)
    And requested spacing 3 cm
    When the last pin on edge 1 falls 1 cm before the corner
    Then the next pin is placed 2 cm into edge 2 (not reset to 0 cm from the corner)

  Scenario: Octagon treats all 8 edges as one continuous path
    Given a regular octagon Pin Path
    When pins are distributed with a requested spacing
    Then cumulative distance is tracked continuously across all 8 edges
    And the closed-path algorithm's chosen interval count treats total perimeter as the sum of all 8 edge lengths

Feature: Geometry precision

  Scenario: Circle uses true circumference
    Given a circle of diameter 10 cm
    Then its computed perimeter equals π × 10 cm (within floating-point tolerance), not a polygon approximation

  Scenario: Ellipse length is numerically accurate
    Given an ellipse with width 10 cm and height 6 cm
    Then its computed perimeter matches a numerical-integration reference value within a defined tolerance (e.g. 0.1%)

  Scenario: Arc length reflects true curvature
    Given an arc defined by start, end, and curvature producing a specific radius and included angle
    Then its computed length equals radius × includedAngle(radians), not the straight-line chord distance

  Scenario: Polygram perimeter follows self-intersecting traversal
    Given a pentagram (5-pointed star polygon) Pin Path
    Then its computed perimeter follows the star's actual point-to-point traversal path
    And is not equal to the perimeter of its convex hull (the outer pentagon)

Feature: Live preview updates

  Scenario: Open-path preview updates as spacing changes
    Given an open path of length 12.7 cm being drawn
    When the requested gap is set to 1 cm
    Then the preview shows "Length: 12.7 cm | Gap: 1 cm | Pins: 13"
    When the requested gap is changed to 2 cm
    Then the preview updates to show 7 pins

  Scenario: Closed-path preview shows requested vs actual gap live while resizing
    Given a circle Pin Path being resized with requested gap 1 cm
    When the diameter is adjusted such that perimeter becomes 37.4 cm
    Then the preview shows "Perimeter: 37.4 cm | Requested gap: 1.0 cm | Actual gap: 1.01 cm | Pins: 37"
```
