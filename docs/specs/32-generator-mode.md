# 32 — Generator Mode

## Purpose

Add a sixth Editor mode, **Generate**, that auto-creates pins and threads from a chosen mathematical pattern and its parameters — instead of drawing shapes and threading pins by hand. The user picks a pattern from a dropdown, sets its parameters, and clicks **Generate** to preview a pin+thread pattern on the board; **Re-generate** replaces that preview; **Confirm** turns the preview into two brand-new, permanent Pin/Thread Layers.

This spec was researched against a read-only analysis of a competitor app's 19 built-in generator patterns (`~/projects/pocs/research_string_art`, not part of this repository). The finding that shaped this spec's scope: **all 19 researched patterns are pure parametric math** — pins built from circle/line/polygon primitives (single or composite: e.g. a hexagram from two overlapping triangles) or, for 2 of the 19, sampled along a closed-form parametric curve. None require a hand-drawn/freehand fallback in the "couldn't figure out the shape" sense, and none require image/photo input or greedy optimization. This spec ships the **engine** (pattern registry + Generate/Re-generate/Confirm workflow) and a **curated set of 5 patterns**, one representative of each engine capability; the other 14 researched patterns are architecturally identical (same registry shape) and are a follow-up milestone, not built here (see Scope below).

## Pin-count vs. pin-spacing

Every other pin-creating path in this app ([07-pin-geometry-engine.md](./07-pin-geometry-engine.md)) is **spacing-driven**: the user requests a physical gap (e.g. "1cm"), and the engine derives however many pins that implies. Generator patterns are **count-driven** instead (Mandala's `n`, Star of David's `nailsPerSide`) — a pattern's thread-index math assumes an *exact* pin count, so an off-by-one would silently misroute threads.

`spacingForPinCount(length, count)` (`src/domain/paths/distribution.ts`) bridges the two: it derives a `requestedSpacing` that makes `distributeClosedPath`/`distributePathPerVertex`'s existing closest-interval-count algorithm land on *exactly* `count`, not just close to it, by biasing the spacing a hair smaller than the naive `length / count` (a floating-point safety margin — re-dividing the naive value can land a hair *below* the integer count and round down). Every generator pattern in this spec goes through this helper before calling the existing `createPinPath`, so pin distribution stays entirely inside the established engine — no new distribution algorithm was written.

## The 5 curated patterns

| Pattern | Pin layout | Threading | Parameters |
|---|---|---|---|
| **Mandala** | One circle, `n` pins | For layer `L` (angular shift `floor(n/layers)·L`): for every pin `i`, connect it to pin `(i·base) mod n`. Each layer is its own Thread Path/colour. | `n` (3–400), `base` (2–99), `layers` (1–20) |
| **Star** | One circle (`circleNails` pins) + one Star shape (existing `"star"` `PinPathGeometry`, `starPoints` points) | Round-robin: alternately visit the next pin of the circle, then the next pin of the star (wrapping the shorter one) | `circleNails` (5–300), `starPoints` (3–20), `starOuterRatio`/`starInnerRatio` (fractions of the board's inscribed radius), `rotation` |
| **Freestyle** | Up to 3 independent circles, each positioned/sized as a fraction of the board | Round-robin across every *enabled* circle: visit pin `r mod count` of each, for `r` from 0 to the largest enabled circle's pin count | Per circle: enabled, `nails`, `radiusRatio`, `centerXRatio`, `centerYRatio` |
| **Star of David** | Two equilateral triangles (`"regular-polygon"`, 3 sides), the second rotated 60° from the first — the standard two-overlapping-triangles construction of a hexagram | Round-robin across the two triangles' pins, same primitive as Star/Freestyle | `nailsPerSide` (2–100), `rotation` |
| **Spirals** | `arms` polar-curve arms, `nailsPerSpiral` pins each, sampled directly (not resampled) into a `"freehand"` `PinPathGeometry` — the one pattern demonstrating the curve-sampled/freehand case | Sequential: connect every sampled pin in generation order (arm-major → inner, radial-step-major → outer), one continuous Thread Path | `arms` (2–20), `nailsPerSpiral` (3–300), `totalAngleTurns`, `rotation` |

All five threading rules reduce to pure index arithmetic over already-built pins (`src/domain/generator/roundRobin.ts`, `mandala.ts`), matching the research finding that every one of the 19 researched patterns threads this way — never by re-deriving geometry mid-traversal.

**Deliberate simplification, stated plainly:** these are original formulas *inspired by* the researched competitor's pattern names and general shapes, not byte-identical reproductions of its exact traversal (which, for e.g. Star, branches on odd/even side count and uses reflected round indices — extra complexity that changes which of two visually similar conventions is used, not whether the pattern is achievable). Mathematical techniques like "connect pin i to pin i·k mod n" are generic string-art methods documented across many hobbyist sources, not unique IP.

## Draft / Confirm state machine

- **Generate** (`EditorStore.generatePattern(params)`): builds a fresh `{ params, pinPaths, threadPaths }` draft from the current pattern/parameters, replacing any existing draft outright. **Non-undoable** — same transient-interaction-state treatment as an in-progress Thread Path draft ([12-thread-editor.md](./12-thread-editor.md)): nothing here is committed to the document yet, so there is nothing meaningful to step back to mid-draft.
- **Re-generate**: the same `generatePattern` call, fired again (the button's label is driven by whether a draft currently exists — `"Generate"` when none, `"Re-generate"` once one does). Fully replaces the previous draft; nothing from the old draft survives.
- **Preview**: while a draft exists, its pins and threads render on the canvas at reduced opacity (`GeneratorPreviewOverlay`, reusing the existing `PinPathVisual`/`ThreadPathVisual` renderers) so it visibly reads as "not yet part of the document," on top of every real layer.
- **Confirm** (`EditorStore.confirmGeneratedPattern()`): the **only undoable step** in the whole flow. Always creates two **brand-new** permanent layers (named `"Generated — <Pattern Name>"`) holding the draft's pin/thread paths, appended in one bundled `SetValueCommand<{pinLayers, threadLayers}>` — a single Undo afterward removes both layers together. Confirm never merges into or otherwise touches an existing layer, so there is no locked-layer check to make. The newly created layers become the active Pin/Thread layers afterward (a non-undoable pointer switch, same precedent as `addPinLayer`/`addThreadLayer` switching the active layer right after their own undoable creation).
- **Leaving Generator mode** with an uncommitted draft discards it (`EditorStore.setMode`) — nothing was ever committed, so there is nothing to lose. Re-entering Generator mode later never resurrects a discarded draft.
- Loading a project (Open / autosave restore) also discards any in-progress draft, same as it already does for an in-progress Thread Path draft.

Pattern/parameter *selection* itself (which pattern is picked, what its fields currently say) is ordinary local UI state in `GeneratorPanel`, not document state — it resets on Re-generate anyway (a param edit is meant to change the next generated result) and is discarded along with the draft on leaving Generator mode, so there's nothing here worth persisting through `EditorStore`.

## Scope

- **This milestone ships 5 patterns** (Mandala, Star, Freestyle, Star of David, Spirals) — chosen to exercise every engine capability: single-shape modular math, a 2-shape composite, an N-shape composite, and the curve-sampled/freehand case. The other 14 patterns researched (Assymetry, Spiral, Wave, Vortex, Polygon, Flower, Maurer Rose, Flower of Life, Comet, Sun, Lotus, Dance of Planets, Crosses, Hexagon Spades) use the identical registry/engine shape and are a follow-up milestone, not built here — same MVP/Phase-2 split this project already uses ([00-overview-and-scope.md](./00-overview-and-scope.md)).
- **No image/photo-to-string-art mode** is in scope or was requested — the competitor research confirms none of its 19 patterns are image-based either. That would be a categorically different feature (image processing + greedy chord selection), not an extension of this engine.
- Confirm always creates new layers; it never offers to merge a generated pattern into an existing layer. A user who wants that can do it manually afterward with the existing Merge action ([26-edit-mode-multi-select.md](./26-edit-mode-multi-select.md)).
- The Generator mode's pins/threads are not integrated with Symmetry ([06-symmetry.md](./06-symmetry.md)) — patterns construct their own composite/rotated geometry directly and are not eligible for the Symmetry panel's mirror/radial config (same as every other non-Pin-mode object in the app).

## Test Cases

```gherkin
Feature: Generating a pattern

  Scenario: Generate builds a draft with the correct pin count
    Given Generator mode is active with the Mandala pattern and n=180
    When the user clicks Generate
    Then a draft with exactly 180 pins on one circle is created
    And the draft is rendered as a preview on the canvas
    And the action is not recorded in the undo history

  Scenario: The Generate button becomes Re-generate once a draft exists
    Given no draft currently exists
    Then the action button reads "Generate"
    When the user clicks it
    Then the action button reads "Re-generate"

  Scenario: Re-generate fully replaces the previous draft
    Given a Mandala draft with n=180 exists
    When the user changes n to 60 and clicks Re-generate
    Then the draft now has exactly 60 pins
    And none of the previous 180 pins remain in the draft

  Scenario: Composite patterns build multiple Pin Paths in one draft
    Given Generator mode is active with the Star pattern
    When the user clicks Generate
    Then the draft contains one circle Pin Path and one star Pin Path
    And a single Thread Path weaves pins from both

  Scenario: Spirals places pins via formula, not distributeClosedPath resampling
    Given Generator mode is active with the Spirals pattern (arms=3, nailsPerSpiral=80)
    When the user clicks Generate
    Then the draft's freehand Pin Path has exactly (80-1)*3 pins
    And each pin sits at its computed radius/angle, unmoved by arc-length resampling

Feature: Confirming a generated pattern

  Scenario: Confirm creates exactly 2 new permanent layers, as one undo step
    Given a generated draft exists
    When the user clicks Confirm
    Then a new Pin Layer and a new Thread Layer are appended to the document
    And the draft is cleared
    And the Re-generate button reverts to reading "Generate"
    And the Confirm button disappears
    And a single Undo removes both new layers together

  Scenario: Confirm never modifies an existing layer
    Given the active Pin Layer already contains hand-drawn pins
    And a generated draft exists
    When the user clicks Confirm
    Then the active Pin Layer's existing content is unchanged
    And the generated pins land in a brand-new layer instead

  Scenario: The newly confirmed layers become active
    Given a generated draft exists
    When the user clicks Confirm
    Then the new Pin Layer becomes the active Pin Layer
    And the new Thread Layer becomes the active Thread Layer

Feature: Discarding an uncommitted draft

  Scenario: Switching Editor mode away discards the draft
    Given a generated draft exists in Generator mode
    When the user switches to Edit mode
    Then the draft is cleared
    And no partial layers were created

  Scenario: Re-entering Generator mode does not resurrect a discarded draft
    Given a draft was discarded by leaving Generator mode
    When the user switches back to Generator mode
    Then no draft or preview is shown
```
