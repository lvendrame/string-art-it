# 11 — Erasers & Cascading Deletion

## Purpose

Define the two mode-specific eraser tools and the cascading deletion rule that keeps threads consistent when a referenced pin is removed.

## Functional Requirements

Pin and Thread modes have **separate erasers**:

- **Thread Eraser** — removes thread geometry (a segment, or a whole Thread Path, per interaction design).
- **Pin Eraser** — removes pin geometry.

### Cascading Deletion Rule

If a deleted pin is referenced by a thread, all thread segments connected to that pin are also removed.

```text
A ─ B ─ C
```

Deleting `B` removes:

```text
A ─ B
B ─ C
```

The entire cascading deletion is a **single undoable operation** (see [10-undo-redo.md](./10-undo-redo.md)).

## Interaction Rules

- Pin Eraser is only available/active in Pin mode; Thread Eraser only in Thread mode (consistent with the mode model in [05-canvas-and-viewport.md](./05-canvas-and-viewport.md)).
- Erasing a pin that belongs to a Pin Path removes that pin from the path's `pins[]`; if erasing individual pins is supported, the path's guide/spacing metadata may become "custom" (no longer strictly matching the requested-spacing-derived set) — the engine must not attempt to silently re-run distribution and re-add the erased pin.
- Erasing all pins of a Thread Path's `pinIds[]` down to fewer than 2 pins removes the Thread Path entirely (a path needs at least 2 pins to represent a segment).
- Erasing respects layer locks: erasing is blocked on a locked layer.

## Test Cases

```gherkin
Feature: Separate erasers per mode

  Scenario: Pin Eraser only works in Pin mode
    Given the editor is in THREAD mode
    Then the Pin Eraser tool is not available/active

  Scenario: Thread Eraser only works in Thread mode
    Given the editor is in PIN mode
    Then the Thread Eraser tool is not available/active

  Scenario: Pin Eraser removes a pin
    Given a Pin Path with pins including pin-5
    When the user erases pin-5 with the Pin Eraser
    Then pin-5 no longer exists in the Pin Path's pins[]

  Scenario: Thread Eraser removes thread geometry without touching pins
    Given a Thread Path connecting pin-1 → pin-2 → pin-3
    When the user erases the segment between pin-2 and pin-3 with the Thread Eraser
    Then the Thread Path no longer includes the pin-2→pin-3 segment
    And pin-2 and pin-3 still exist as pins

Feature: Cascading deletion on pin removal

  Scenario: Deleting a middle pin removes both adjacent thread segments
    Given a Thread Path A → B → C (pin-A, pin-B, pin-C)
    When the user erases pin-B with the Pin Eraser
    Then the segment A→B is removed
    And the segment B→C is removed
    And pin-B no longer exists

  Scenario: Cascading deletion is one undo step
    Given the scenario above has just occurred
    When the user invokes Undo once
    Then pin-B is restored
    And both the A→B and B→C segments are restored
    And the Thread Path structure matches its pre-deletion state exactly

  Scenario: Deleting an endpoint pin only removes its one segment
    Given a Thread Path A → B → C
    When the user erases pin-A
    Then only the A→B segment is removed
    And the B→C segment remains intact
    And the resulting Thread Path is B → C

  Scenario: Deleting a pin used by multiple independent Thread Paths cascades across all of them
    Given pin-X is referenced by Thread Path 1 (W→X) and Thread Path 2 (X→Z)
    When the user erases pin-X
    Then Thread Path 1's W→X segment is removed
    And Thread Path 2's X→Z segment is removed
    And both removals plus the pin removal undo together in a single Undo

  Scenario: Thread Path reduced below 2 pins is removed entirely
    Given a Thread Path with only pin-A and pin-B (A→B)
    When the user erases pin-B
    Then the Thread Path is deleted entirely (fewer than 2 pins remain)

Feature: Erasing respects layer locks

  Scenario: Cannot erase on a locked layer
    Given a Pin Path belongs to a locked Pin Layer
    When the user attempts to erase one of its pins
    Then no pin is removed
```
