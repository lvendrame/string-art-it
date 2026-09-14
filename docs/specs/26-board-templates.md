# 26 — Board Templates

## Purpose

Give the New Board screen ([03-board-configuration.md](./03-board-configuration.md)) an option to start from a pre-built pin/thread design instead of configuring a board from scratch — a way to explore the app with an interesting result immediately, or as a starting point to customize.

## Data source and fidelity

Nine templates were derived from external string-art reference renders (SVGs of pre-existing line-art designs, not part of this app or its runtime — used only offline, at generation time). Every template is expressed purely in terms of the app's own document model — a real `PinLayer`/`ThreadLayer` pair, exactly the shape `EditorStore.toProjectFile()` produces — with no SVG markup, image, or reference to the source art anywhere in the shipped app or its loader.

`scripts/generateBoardTemplates.mjs` (a one-time authoring tool, not part of the app bundle) does the real work: for each source design it

1. Parses every drawn line and clusters its endpoints into unique pin coordinates.
2. Detects whether the source is actually **one drawn arm/half repeated via the app's own Symmetry feature** (radial or mirror — [06-symmetry.md](./06-symmetry.md)) rather than one uniform shape: it looks for the source's own N-fold rotational or reflective self-similarity (gated by an azimuthal-density check so an ordinary uniform ring, like a plain circle, is never mistaken for a repeated arm). When found, only the ONE source arm is fit and stored — every other repetition's chords reference the app's derived `<pinId>~mirror-N` ids ([`application/document/symmetryConfig.ts`](../../src/application/document/symmetryConfig.ts)), precisely how a person building the same design by hand would use the Symmetry panel.
3. Fits that one arm (or the whole shape, if no symmetry was detected) against the real supported `PinPathGeometry` variants, in order: **line → circle/ellipse → rectangle/square → regular-polygon/star**, falling back to an explicit **freehand** polyline only when none of those fit. A candidate polygon/star is additionally required to have its points actually sit ON the fitted straight edges (not merely have the right rotational symmetry) before being accepted — a shape with incidental N-fold symmetry but organic, interior-scattered points (e.g. a hand-drawn flower/lotus motif) is correctly rejected in favour of freehand rather than collapsing into a misleadingly clean N-gon that would throw away its real detail.
4. Rebuilds every pin position through the same distribution math the app itself uses (`src/domain/paths/distribution.ts`, ported into the script) — a Circle/Ellipse gets uniform closed-path spacing, a Rectangle/Square/regular-polygon/star gets per-edge vertex-anchored spacing, a Line/Arc/Freehand gets open-path spacing — so a later in-editor edit (e.g. changing spacing) recomputes to the same pins.
5. Replays the original line sequence into `ThreadPath`s split at each colour change (one `ThreadPath` per contiguous colour run, mirroring how these designs are actually authored: draw once, apply Symmetry, recolour each resulting copy).
6. Each source's chord sequence is evenly downsampled (not truncated from the start) to at most 1200 lines for interactive performance — the densest sources (Lotus/Sun originally ~2600-3000 lines) lose some fine density but keep full spatial coverage.

Where a template genuinely fits a clean single/repeated shape (Spiral → one big Circle; Comet → one Arc mirrored horizontally; Polygon → a Pentagon; Star of David → correctly identified as **not** a simple star and left as freehand, since it's really two overlapping triangles whose edges dip through the interior) the result is exact-by-construction. Where the source is genuine organic/generative art with no matching primitive (Flower, Lotus, Sun, Spirals, Assymetry — confirmed case by case, not assumed), the template is an explicit `freehand` Pin Path — a real, editable, undoable Pin Path like any hand-drawn one, just not visually identical to the source pixel-for-pixel.

Thread colour uses the app's existing 3-colour spiral rendering only where a single `ThreadPath` needs it; most templates instead use several single-colour `ThreadPath`s (one per detected colour run), which is a closer match to how these multi-hue designs are actually built than forcing everything through one 3-stop gradient.

## Data shape

Each template is a real, standalone project file — the app's own `ProjectFileV1` format ([`application/document/projectFile.ts`](../../src/application/document/projectFile.ts): `{ version, board, grid, pinLayers, threadLayers }`) — written to `public/board-templates/<id>.json` by the generation script. These are ordinary static assets (not bundled into the app's JS), fetched on demand.

`src/ui/panels/boardTemplates/boardTemplates.ts` is a small, hand-written manifest (the data-driven-content pattern already used for Help, [helpContent.ts](../../src/ui/panels/help/helpContent.ts) — see [ui-patterns.md](../conventions/ui-patterns.md)):

```ts
interface BoardTemplate {
  id: string;
  nameKey: string; // boardSetup:templates.<nameKey>
  url: string; // e.g. "/board-templates/spiral.json"
}
```

## New Board screen behaviour

A **Templates** section is added to the top of the existing Board Setup form ([03-board-configuration.md](./03-board-configuration.md)), above the Shape section: a grid of cards, one per `BOARD_TEMPLATES` entry, showing only the translated name (no thumbnail image).

Clicking a card fetches its `url`, migrates/parses the JSON into a document (`migrateProjectFile` → `projectFileToDocument`, the same functions `FileMenu`'s Open action already uses), and **replaces the setup wizard entirely**: `loadProject`/`fitViewportForBoard` swap in the new document (undo history reset, id counters reseeded, per [16-persistence.md](./16-persistence.md)) and the editor opens immediately, exactly as if the user had opened a saved project. A failed fetch/parse shows the same translated error alert Open-file failures use (`mapOpenFileError`), and never calls `onContinue`. The manually-configured Shape/Dimensions/Appearance fields on the same screen are unaffected by, and have no effect on, a template choice — the two are alternative ways to leave this screen, not composable steps.

## Test Cases

```gherkin
Feature: Board templates

  Scenario: Templates section lists every available template
    Given the New Board screen is open
    Then one card is shown per entry in BOARD_TEMPLATES, with its translated name

  Scenario: Selecting a template opens the editor with that design loaded
    Given the New Board screen is open
    When the user clicks a template card
    Then its project file is fetched and loaded as the live document
    And the editor opens
    And undo history is empty (Ctrl/Cmd+Z is a no-op immediately after)

  Scenario: A template fails to load
    Given the New Board screen is open
    When the user clicks a template card and the fetch fails
    Then a translated error alert is shown
    And the editor does not open

  Scenario: A template file stays a valid ProjectFile
    Given any entry in BOARD_TEMPLATES
    When its file at `public/<url>` is round-tripped through migrateProjectFile/projectFileToDocument
    Then it produces at least one pin and one thread with no error
```
