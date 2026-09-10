# 09 — Selection & Editing

## Purpose

Define what the Selection tool can select and how selecting an existing Pin Path exposes its editable geometry, enabling modification rather than requiring redraw.

## Selection Scope

Selection supports:

- Pin Paths
- Individual pins where appropriate
- Thread Paths
- Symmetry centre (radial)
- Editable board controls

## Pin Path Editing by Shape

Selecting an existing Pin Path exposes its geometry parameters for direct editing. Any relevant edit **automatically recalculates generated pins** (per [07-pin-geometry-engine.md](./07-pin-geometry-engine.md)) and, if the path has symmetry attached, regenerates mirrored/radial copies (per [06-symmetry.md](./06-symmetry.md)).

| Shape | Editable properties |
|---|---|
| Line | Start, End |
| Arc | Start, End, Curvature |
| Circle | Centre, Radius |
| Ellipse | Centre, Width, Height, Rotation |
| Rectangle | Position, Width, Height, Rotation |
| Square | Position, Side, Rotation |
| Polygon / Star | Centre, Size, Rotation, shape-specific parameters (e.g. point count for stars, inner/outer radius ratio) |

Also editable regardless of shape (see [08-pin-tools-and-properties.md](./08-pin-tools-and-properties.md)):

- Spacing
- Colour
- Diameter
- Geometry size
- Position
- Rotation
- Guide visibility
- Shape-specific properties

## Interaction Rules

- Selecting an object switches focus to its property panel; the object's control handles (e.g. Line's start/end grips, Arc's curvature grip) become interactive on canvas.
- Dragging a handle updates the geometry live, with the pin-count/spacing preview updating in real time (same live-preview behavior as initial drawing).
- Selecting a Thread Path exposes thread-level properties (colours, width — see [12-thread-editor.md](./12-thread-editor.md)); it does not expose pin-geometry controls.
- Selecting the radial symmetry centre allows it to be dragged, per [06-symmetry.md](./06-symmetry.md).
- Selecting an object on a locked layer must not allow edits (see [13-layers.md](./13-layers.md)).

## Test Cases

```gherkin
Feature: Selecting objects

  Scenario: Selecting a Pin Path exposes its geometry handles
    Given a Circle Pin Path exists on canvas
    When the user selects it with the Selection tool
    Then centre and radius handles become visible and draggable
    And the property panel shows Centre, Radius, Spacing, Colour, Diameter, Guide visibility

  Scenario: Selecting a Thread Path exposes thread properties, not pin geometry
    Given a Thread Path exists connecting several pins
    When the user selects it
    Then the property panel shows colours, width, and twist configuration
    And no pin-geometry controls (radius, side length, etc.) are shown

  Scenario: Selecting the radial symmetry centre allows repositioning
    Given a Pin Path with radial symmetry and a visible centre indicator ◎
    When the user selects and drags the centre
    Then all radial copies recompute around the new centre position

Feature: Editing geometry recalculates pins

  Scenario: Changing Circle radius recalculates pin count
    Given a selected Circle Pin Path with radius 5 cm and requested spacing 1 cm
    When the user drags the radius handle to 8 cm
    Then the perimeter, actual spacing, and pin positions are recalculated for the new radius
    And the pin count updates to match the closed-path algorithm's result for the new perimeter

  Scenario: Changing Line endpoints recalculates open-path pins
    Given a selected Line Pin Path from (0,0) to (8,0) cm with spacing 1 cm (9 pins)
    When the user drags the End handle to (7.5, 0) cm
    Then the pin count updates to 8 per the open-path algorithm

  Scenario: Changing Arc curvature recalculates pins live
    Given a selected Arc Pin Path
    When the user drags the curvature handle to increase the arc's radius
    Then the arc length, and thus the pin count/positions, update in real time

  Scenario: Editing a shape with symmetry regenerates mirrored copies
    Given a selected Pin Path with vertical symmetry and one mirrored copy
    When the user changes the Rectangle's Width
    Then the source Rectangle's pins are recalculated
    And the mirrored copy is regenerated to reflect the updated source

  Scenario: Rotating a Polygon updates pin positions without changing pin count
    Given a selected regular Hexagon Pin Path with 30 pins
    When the user rotates it by 15°
    Then all 30 pins rotate correspondingly
    And the pin count remains 30 (rotation does not trigger redistribution)

Feature: Editing respects layer locks

  Scenario: Cannot edit a Pin Path on a locked layer
    Given a Pin Path belongs to a locked Pin Layer
    When the user attempts to drag one of its geometry handles
    Then the geometry does not change
    And the property panel controls for that object are disabled or the edit is rejected
```
