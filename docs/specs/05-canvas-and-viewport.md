# 05 — Canvas & Viewport

## Purpose

Define the editor's interaction modes, grid, snapping priority, pin snap radius, zoom/pan, the physical coordinate system, and the status bar. These are cross-cutting canvas behaviors used by every drawing tool.

## Editor Modes

The editor always has exactly one explicit interaction mode:

```text
SELECT
PIN
THREAD
PAN
```

- **Select** — select and modify existing objects (see [09-selection-and-editing.md](./09-selection-and-editing.md)).
- **Pin** — create and modify pin geometry (see [08-pin-tools-and-properties.md](./08-pin-tools-and-properties.md)).
- **Thread** — create thread paths between existing pins (see [12-thread-editor.md](./12-thread-editor.md)).
- **Pan** — navigate the canvas without modifying objects.

Only one mode is active at a time; switching modes cancels any in-progress, unconfirmed drawing interaction (e.g. an arc mid-curvature-adjustment, or a thread path with zero confirmed segments).

## Grid

Settings:

- Horizontal gap
- Vertical gap
- Grid visibility
- Snap to grid

```text
Horizontal gap: 1 cm
Vertical gap:   1 cm

Grid visible:   Yes
Snap to grid:   Yes
```

**Grid visibility and snapping are independent.** `Grid visible: OFF` + `Snap to grid: ON` is a valid, supported combination — the grid can be invisible while still exerting a magnetic pull on the cursor.

### Grid Snap Feedback

When grid snapping is enabled, the active grid intersection nearest the cursor receives a visual indicator:

```text
+       +       +

+       ⊕       +
        ↑
   snap target
```

This indicator is shown even when the grid lines themselves are hidden (`Grid visible: OFF`, `Snap to grid: ON`), since the user still needs feedback on where the cursor will land.

## Snapping Priority

Confirmed, deterministic processing order applied to every raw pointer position before it is used to place/move geometry:

```text
Raw pointer
     ↓
Nearest pin / object snap
     ↓
Grid snap
     ↓
Geometry constraint (e.g. Alt for circle/square)
     ↓
Mirror / symmetry
```

Each stage either passes the coordinate through unchanged or transforms it; the pipeline always runs in this fixed order so the same input always produces the same output (determinism requirement).

## Pin Snap Radius

Nearest-pin snapping activates only inside a maximum visual snap radius around the cursor. Pins outside the radius are not valid candidates.

```text
       snap radius
    ┌──────────────┐
    │      ●       │
    │              │
    │      +       │ ← cursor
    └──────────────┘
```

The radius is expressed in **screen-space pixels**, not physical document units, so interaction stays predictable regardless of zoom level (a pin that's 5px away on screen should snap the same way at 50% zoom as at 400% zoom). The exact default radius is a UI-implementation decision (see [00-overview-and-scope.md](./00-overview-and-scope.md) "Remaining Minor Product Decisions").

## Zoom and Pan

Required capabilities:

- Zoom in / zoom out
- Mouse wheel / trackpad zoom
- Pan
- Fit board to viewport
- 100% view

**Viewport changes never modify physical dimensions.** Zoom/pan are purely presentational transforms.

## Physical Coordinate System

The internal document uses physical units (e.g. centimetres), not screen pixels.

```text
Board width:  60 cm
Board height: 40 cm
```

The same board may render as `300 × 200 px` or `1500 × 1000 px` depending on zoom, without any change to stored physical measurements.

```text
Document Coordinates
        ↓
Viewport Transform
        ↓
Screen Coordinates
```

All geometry, spacing, and distance calculations operate in document (physical) coordinates. Screen coordinates exist only for input handling and rendering, and are converted back to document coordinates via the inverse Viewport Transform before being fed into the Geometry Engine.

## Status Bar

Content changes based on current mode/action:

**Normal (Select/Pan, idle)**
```text
X: 13.4 cm | Y: 27.8 cm | Zoom: 125%
```

**Pin Drawing (open path)**
```text
Length: 12.7 cm | Pins: 13 | Gap: 1 cm
```

**Pin Drawing (closed shape)**
```text
Requested: 1 cm | Actual: 0.98 cm | Pins: 64
```

**Thread Drawing**
```text
From Pin 24 → Pin 67 | Segment: 8.3 cm
```

## Test Cases

```gherkin
Feature: Editor modes

  Scenario: Only one mode is active at a time
    Given the editor is in PIN mode
    When the user switches to THREAD mode
    Then PIN mode is no longer active
    And any unconfirmed pin drawing in progress is cancelled

  Scenario: Switching modes cancels an in-progress arc
    Given the user is mid-way through drawing an Arc (start and end placed, curvature not yet confirmed)
    When the user switches to SELECT mode
    Then the arc is not added to the document
    And no partial Pin Path is created

Feature: Grid visibility and snapping independence

  Scenario: Grid can snap while invisible
    Given Grid visible = OFF and Snap to grid = ON
    When the user moves the cursor near a grid intersection
    Then the cursor position snaps to that intersection
    And a snap-target indicator is shown at that intersection
    And no grid lines are rendered

  Scenario: Grid can be visible without snapping
    Given Grid visible = ON and Snap to grid = OFF
    When the user moves the cursor near a grid intersection
    Then grid lines are rendered
    And the cursor position is not altered toward the intersection

Feature: Deterministic snapping priority

  Scenario: Pin snap takes priority over grid snap
    Given a pin exists within snap radius of the cursor
    And a grid intersection also exists within snap radius, at a different position
    When the cursor moves to a position ambiguous between the two
    Then the resulting snapped position is the pin position, not the grid intersection

  Scenario: Grid snap applies when no pin is in range
    Given no pin exists within snap radius of the cursor
    And Snap to grid = ON
    When the cursor moves near a grid intersection
    Then the resulting snapped position is the grid intersection

  Scenario: Geometry constraint applies after snapping
    Given Alt is held while drawing an Ellipse
    And the cursor position has already been snapped to a grid intersection
    Then the final shape is constrained to a Circle using the snapped centre

Feature: Pin snap radius is screen-space

  Scenario: Snap radius stays visually constant across zoom levels
    Given a pin is exactly 5 screen pixels away from the cursor at 50% zoom
    And the snap radius is 10 screen pixels
    Then the pin is a valid snap candidate
    When the view is zoomed to 400%
    And the same pin is still exactly 5 screen pixels away from the cursor
    Then the pin is still a valid snap candidate (radius did not shrink/grow in document units)

  Scenario: Pin outside snap radius is not a candidate
    Given a pin is 20 screen pixels away from the cursor
    And the snap radius is 10 screen pixels
    Then that pin is not offered as a snap candidate

Feature: Zoom and pan do not affect document state

  Scenario: Zooming does not change board dimensions
    Given a board with Width = 60 cm, Height = 40 cm
    When the user zooms to 400%
    Then the stored board Width and Height remain 60 cm and 40 cm

  Scenario: Panning does not move document objects
    Given a Pin Path centred at document coordinate (10cm, 10cm)
    When the user pans the viewport
    Then the Pin Path's stored geometry coordinates are unchanged

  Scenario: Fit-to-viewport recalculates zoom, not geometry
    Given a board larger than the current viewport
    When the user invokes "Fit to viewport"
    Then the zoom level changes so the whole board is visible
    And no board, pin, or thread coordinates change

Feature: Status bar reflects current interaction

  Scenario: Status bar shows cursor position and zoom when idle
    Given the editor is in SELECT mode with no active drawing
    When the cursor is at document position (13.4cm, 27.8cm) and zoom is 125%
    Then the status bar displays "X: 13.4 cm | Y: 27.8 cm | Zoom: 125%"

  Scenario: Status bar shows live pin count while drawing an open path
    Given the user is drawing a Line with requested gap 1 cm
    When the in-progress length is 12.7 cm
    Then the status bar displays "Length: 12.7 cm | Pins: 13 | Gap: 1 cm"

  Scenario: Status bar shows requested vs actual gap for a closed shape
    Given the user is drawing a Circle with requested gap 1 cm
    When the resulting closed-path actual spacing is 0.98 cm at 64 pins
    Then the status bar displays "Requested: 1 cm | Actual: 0.98 cm | Pins: 64"
```
