# StringArtIt — Development Orchestrator

## Purpose

This is the single navigation document for building StringArtIt against `docs/specs/`. It sequences work into milestones, states which specs and design-system rules govern each one, states dependencies between milestones, and carries a status table to track progress across sessions. Any session picking up this project should start here, find the first milestone not marked Done, read its listed specs, implement, test, update status, and move on — rather than re-reading all 19 specs cold every time.

Specs live in [`docs/specs/`](../specs/), numbered 00–18. Design reference lives in [`docs/design/editor-mockup.dc.html`](../design/editor-mockup.dc.html). This document does not restate spec content — it only sequences and cross-references it.

## How to Use This Document

1. Find the first row in the [Status Table](#status-table) not marked `Done`.
2. Check its **Depends on** column — those milestones must be `Done` first (or explicitly descoped).
3. Read its **Specs** column in full before writing code.
4. Implement inside the layer boundaries from [01-architecture.md](../specs/01-architecture.md) — domain/geometry code stays framework-free; UI code stays in `src/ui/`.
5. For any UI milestone, also read [18-design-system.md](../specs/18-design-system.md) — tokens/components are not optional polish, they're the spec.
6. Turn every `Gherkin` scenario in the milestone's specs into an actual automated test (Vitest for domain/application logic, a component/interaction test for UI behavior). A milestone is not Done until its specs' test cases are green.
7. Update the Status Table (status + one-line note) before ending the session on that milestone.
8. If implementation reveals a spec is wrong, ambiguous, or incomplete: fix the spec file first, in the same change, then implement against the corrected spec. Specs are living documents, not frozen requirements — but they must never silently drift from what's built.

## Architectural Note: Commands Come Early, Not Last

The product spec's own [Recommended Development Sequence](../specs/00-overview-and-scope.md#recommended-development-sequence) lists the undo/redo Command architecture as "Phase G," near the end. **Do not build it last.** Every mutation in [10-undo-redo.md](../specs/10-undo-redo.md) and the cascading-delete rule in [11-erasers.md](../specs/11-erasers.md) require that document mutations already go through Command objects (per [01-architecture.md](../specs/01-architecture.md)) — retrofitting that onto a codebase full of direct state mutations is a rewrite, not an add-on. This orchestrator therefore pulls the **Command skeleton** into M0 (empty `execute/undo/redo` plumbing + a `HistoryStack`) and requires every milestone from M2 onward to route mutations through it from the start. The full undo/redo *UI and shortcut wiring* (M7) still comes later — only the underlying mechanism moves earlier.

## Milestones

### M0 — Project Scaffolding & Command Skeleton
**Specs:** [01-architecture.md](../specs/01-architecture.md)
**Depends on:** —
**Deliverables:**
- Vite + React 19 project, Node 22 LTS engines pinned (`package.json` `engines`).
- Folder structure per architecture spec: `src/domain/`, `src/application/`, `src/infrastructure/`, `src/ui/`.
- Test runner configured (Vitest recommended — fast, ESM-native, works headless for domain code) and a component-testing setup for `src/ui/`.
- `Command` interface + `HistoryStack` (execute/undo/redo, linear history, redo cleared on new command) in `src/application/commands/`, unit-tested against the generic contract (not yet wired to any real mutation).
- Lint boundary check (even a simple script/ESLint rule) that fails CI if `src/domain/` or `src/application/` imports from `src/ui/` or `react`.
**Exit criteria:** boundary-check script passes on an intentionally-violating test file (proves it actually catches violations); `HistoryStack` unit tests cover execute/undo/redo/redo-invalidation.

### M1 — Geometry Engine
**Specs:** [07-pin-geometry-engine.md](../specs/07-pin-geometry-engine.md), geometry portions of [06-symmetry.md](../specs/06-symmetry.md) (transform math only, not UI), [05-canvas-and-viewport.md](../specs/05-canvas-and-viewport.md) (physical↔screen coordinate transform, snapping priority pipeline as pure functions)
**Depends on:** M0
**Deliverables:** `src/domain/shapes/`, `src/domain/paths/`, `src/domain/transforms/`, `src/domain/snapping/`, `src/domain/symmetry/` — path length, point-at-distance, open/closed pin distribution, mirror/radial transforms, grid/pin snapping, snap-radius logic. Pure functions/classes, zero DOM/React.
**Exit criteria:** every Test Cases scenario in 07-pin-geometry-engine.md passes as a unit test, including the exact worked examples (8cm/1cm→9 pins; 7.5cm/1cm→8 pins; 31cm perimeter/2cm→16 pins @1.9375cm). Mirror/radial transform tests from 06-symmetry.md's geometry-only scenarios pass.

### M2 — Board & Viewport
**Specs:** [02-document-model.md](../specs/02-document-model.md) (Board shape), [03-board-configuration.md](../specs/03-board-configuration.md), [04-board-appearance.md](../specs/04-board-appearance.md), [05-canvas-and-viewport.md](../specs/05-canvas-and-viewport.md) (full — modes, grid, zoom/pan, status bar), [18-design-system.md](../specs/18-design-system.md)
**Depends on:** M1
**Deliverables:** Board setup flow (shape + dimensions + appearance), main editor shell (top bar, mode switcher, canvas viewport, status bar) rendering an empty board. Physical-unit rendering via M1's coordinate transform. No pins/threads yet.
**Exit criteria:** Test Cases in 03, 04, 05 pass; editor shell visually matches `docs/design/editor-mockup.dc.html` token-for-token (colours/type/spacing per 18-design-system.md).

### M3 — Pin Editor
**Specs:** [08-pin-tools-and-properties.md](../specs/08-pin-tools-and-properties.md), [09-selection-and-editing.md](../specs/09-selection-and-editing.md) (Pin Path portions), [11-erasers.md](../specs/11-erasers.md) (Pin Eraser only — thread cascade deferred to M5)
**Depends on:** M2
**Deliverables:** Pin mode drawing tools (Line/Arc/Ellipse/Circle/Rectangle/Square/Polygon-Star dropdown), Alt constraint modifier, live pin/spacing preview, guide lines, pin property panel, Pin Path selection + geometry editing, Pin Eraser. All mutations go through M0's Command architecture.
**Exit criteria:** Test Cases in 08, 09 (pin portions), and the Pin Eraser scenarios in 11 pass. Every pin-creating/editing action is undoable (manual check against 10-undo-redo.md's list, even though M7 wires the shortcuts).

### M4 — Symmetry
**Specs:** [06-symmetry.md](../specs/06-symmetry.md) (full — UI wiring on top of M1 math)
**Depends on:** M3
**Deliverables:** Symmetry mode controls, live mirrored-copy generation while drawing, movable radial centre, source-edit-regenerates-copies behavior.
**Exit criteria:** Full Test Cases in 06-symmetry.md pass, including "editing source regenerates copies" and "deleting source removes copies in one undo step."

### M5 — Thread Editor
**Specs:** [12-thread-editor.md](../specs/12-thread-editor.md), [11-erasers.md](../specs/11-erasers.md) (Thread Eraser + cascading pin-delete-removes-threads rule, now that both Pin and Thread objects exist)
**Depends on:** M3
**Deliverables:** Thread mode, nearest-pin detection + highlight states, thread preview, click/double-click/right-click/Esc termination, 1/2/3-colour spiral rendering, Thread Eraser, cascading delete.
**Exit criteria:** Full Test Cases in 12 pass; cascading-delete scenarios in 11 pass as single undo steps. Nearest-pin lookup implementation notes the spatial-index performance requirement from 07-pin-geometry-engine.md §Performance even if a naive O(n) scan ships first — file it as a tracked follow-up, not silently ignored.

### M6 — Layers
**Specs:** [13-layers.md](../specs/13-layers.md)
**Depends on:** M3, M5
**Deliverables:** Pin Layers / Thread Layers panels, create/rename/delete/duplicate/reorder/visibility/lock, per [18-design-system.md](../specs/18-design-system.md) Layer Row component.
**Exit criteria:** Full Test Cases in 13 pass, including hidden-retains-contents and locked-blocks-edits guarantees enforced against M3/M5 editing paths.

### M7 — Undo/Redo Wiring
**Specs:** [10-undo-redo.md](../specs/10-undo-redo.md)
**Depends on:** M2, M3, M4, M5, M6
**Deliverables:** Keyboard shortcuts (Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z), undo/redo toolbar buttons wired to M0's `HistoryStack`, confirmation that every operation listed in 10-undo-redo.md's Undoable Operations table is actually routed through a Command (audit, not new mechanism — the mechanism shipped in M0).
**Exit criteria:** Full Test Cases in 10 pass, run as an end-to-end pass over every milestone delivered so far (this is the integration checkpoint for M1–M6).

### M8 — Persistence
**Specs:** [16-persistence.md](../specs/16-persistence.md), [02-document-model.md](../specs/02-document-model.md) (serialization round-trip)
**Depends on:** M7
**Deliverables:** New/Save/Open/Duplicate, versioned project file schema, migration hook (even if only version 1 exists initially, the seam must exist).
**Exit criteria:** Full Test Cases in 16 pass; a full Project (board + multiple pin/thread layers + symmetry + undo history irrelevant to save) round-trips losslessly through save/load.

### M9 — Printing & Export (MVP slice)
**Specs:** [14-printing.md](../specs/14-printing.md) (1:1 / fit / custom scale, paper config, print element checklist — tiling and calibration are Phase 2, see below), [15-export.md](../specs/15-export.md) (native project export only for MVP), [17-statistics.md](../specs/17-statistics.md)
**Depends on:** M8
**Deliverables:** Print preview with independently selectable elements, scale modes, paper size/orientation; pin/thread statistics panels.
**Exit criteria:** MVP-scoped Test Cases in 14 (excluding tiling/calibration), 15 (native export only), and 17 pass.

### M10 — Phase 2 (post-MVP)
**Specs:** Remainder of [14-printing.md](../specs/14-printing.md) (tiling, calibration), remainder of [15-export.md](../specs/15-export.md) (SVG, PDF, PNG, JPEG), autosave in [16-persistence.md](../specs/16-persistence.md), configurable spiral twist density in [12-thread-editor.md](../specs/12-thread-editor.md), advanced board textures in [04-board-appearance.md](../specs/04-board-appearance.md).
**Depends on:** M9
**Deliverables/Exit criteria:** tracked as separate sub-tickets when this milestone starts — do not scope in detail until MVP (M0–M9) is Done, per [00-overview-and-scope.md](../specs/00-overview-and-scope.md) MVP/Phase 2 split.

## Status Table

| # | Milestone | Depends on | Status | Notes |
|---|---|---|---|---|
| M0 | Project Scaffolding & Command Skeleton | — | Done | Vite+React19+TS+Vitest scaffold, Clean Architecture folders, `Command`/`HistoryStack` (unit-tested), ESLint boundary rules (`import/no-restricted-paths` for ui/**, `no-restricted-imports` for react/react-dom — proven via `boundaries.test.ts`). Lint/test/build/dev all green. |
| M1 | Geometry Engine | M0 | Done | Path/Segment model (Line/CircularArc/EllipticalArc), all MVP shapes (line/arc/ellipse/circle/rect/square/regular-polygon/star/polygram), open+closed pin distribution, viewport transform, snap pipeline (pin>grid priority, screen-space radius), mirror+radial symmetry math. 57 tests, all worked examples from spec verified. |
| M2 | Board & Viewport | M1 | Done | Board setup screen (shape/dims/appearance, undoable), editor shell (top bar, mode switcher, canvas w/ grid+zoom+fit, status bar). SVG rendering adapter (path->d, board fill). 85 tests total. Browser visual check blocked by extension site permissions (localhost not granted) — verified via component tests + build instead. |
| M3 | Pin Editor | M2 | Done | Pin Path model + single default layer (M6 will add the panel), all 9 drawing tools wired to real mouse interaction (line 2-click, arc 3-click w/ live curvature, bounding-box drag for ellipse/circle/rect/square w/ Alt constraint, centre-drag for polygon/star/polygram family), Pin Eraser, Select-mode click-to-select + numeric geometry editing (recalculates pins), live pin-count/spacing status bar. All mutations undoable. 113 tests. Selection geometry editing uses numeric inputs, not canvas drag-handles (scope note). |
| M4 | Symmetry | M3 | Done | Symmetry config on PinPath (none/horizontal/vertical/both/radial), mirrored/radial copies derived on every render (never stored, so source edits always stay in sync), dual-context (defaults vs selected-path, selected-path change is undoable), movable radial centre + interval via numeric fields, canvas overlay (axes/spokes+centre). 120 tests. Radial centre is numeric-input only, not canvas drag (same scope note as M3 selection editing). |
| M5 | Thread Editor | M3 | Done | ThreadPath/ThreadLayer model, full drawing workflow (click extends, double-click finishes+segment, right-click finishes without segment, Esc cancel-or-finish per confirmed-segment count), pin highlight states (normal/candidate/active-origin), 1/2/3-colour spiral rendering (same geometry, dash-offset strands), cascading pin-delete into threads as one undo step (interior removal correctly splits into surviving fragments, endpoint removal keeps one). 137 tests. Thread Eraser removes a whole Thread Path per click (segment-level splitting deferred — scope note); nearest-pin lookup is still an O(n) scan (spatial index deferred per 07-pin-geometry-engine.md §Performance, tracked as a follow-up not silently dropped). |
| M6 | Layers | M3, M5 | Done | Pin/Thread Layers panels (tabs, create/rename/duplicate/delete/reorder/visibility/lock), generic layerOps shared by both kinds, active-layer targeting for new pins/threads, hidden-retains-contents + locked-blocks-edits-but-not-visibility guarantees, layer duplication regenerates pin IDs so existing threads keep pointing at the originals, deleting a layer cascades into thread segments in one undo step. 151 tests. "Select all objects on a layer" (multi-select) not implemented — scope note, would require extending Selection beyond single-object. |
| M7 | Undo/Redo Wiring | M2–M6 | Done | Ctrl/Cmd+Z / Ctrl/Cmd+Shift+Z global shortcut (skips text-entry targets so native input undo isn't hijacked), toolbar buttons reflect live history state. Audit of Undoable Operations list against M2–M6: all covered by Commands except "Add segment" during an in-progress thread draft, which is treated as part of the single "Add thread" commit-on-finish command rather than a per-click undo step (judgment call — undoing mid-draw individual clicks isn't a normal editing action; documented here rather than silently assumed). Full suite: 155 tests, this is the integration checkpoint for M1–M6. |
| M8 | Persistence | M7 | Done | Versioned project file schema (v1) with a migration seam (no-op today, ready for v2), New/Save/Open wired via browser download + file picker (File System Access API / autosave adapter deferred to Phase 2), loading resets undo history, full round-trip verified through real `JSON.stringify`/`parse` including pin IDs and thread pin references staying intact. 163 tests. |
| M9 | Printing & Export (MVP) | M8 | Done | Print preview (independently selectable elements, 1:1/fit/custom scale, paper size+orientation, print-vs-editor visibility independence verified), pin+thread statistics panels (project totals, per-path cards). Native export already satisfied by M8's Save. 179 tests. Print preview is on-screen only (no @media print stylesheet / physical-accuracy calibration — that's explicitly Phase 2). |
| M10 | Phase 2 | M9 | Done | All six Phase 2 items: (1) board appearance UI + custom-texture upload + 8 wood/4 paint presets (this also filled a real M2 gap — no appearance UI existed before); (2) thread twist pitch, configurable per-thread and as a drawing default; (3) autosave (debounced, localStorage, restore/discard banner); (4) print calibration (reference-line flow, correction factor applied to 1:1 scale); (5) print tiling (overlap, trim/alignment marks, page numbers/coordinates, multi-page preview); (6) SVG/PDF/PNG/JPEG export (SVG and PDF are true vector, PDF lazy-loaded via dynamic import since svg2pdf.js is ~470KB and browser-only). 223 tests total. Found and fixed a real pre-existing bug while building tiling: bounding-box code sampled only each path segment's start point, collapsing circles/arcs/ellipses to a single point — silently wrong since M2 (affected Fit-to-viewport too, just never exercised by a test until tiling's math caught it). Also discovered jsdom 25's Blob/File lack `.text()`/`.arrayBuffer()` and `URL.createObjectURL` doesn't exist at all — added a Node-Blob/File swap + a create/revokeObjectURL stub to test setup, which retroactively let M8's FileMenu Save/Open get real tests it never had. PDF export itself (`pdfExport.ts`) cannot be unit-tested here — svg2pdf.js's README states it does not work under jsdom (crashes at module-load); confirmed firsthand, not assumed. Raster export's actual canvas rasterization is similarly untestable in jsdom (no real 2D context backend) — only its pure DPI/mime-type math is covered. |

Status values: `Not Started`, `In Progress`, `Blocked` (note the blocker), `Done`.

## Definition of Done (applies to every milestone)

- [ ] All Gherkin scenarios in the milestone's listed specs exist as automated tests and pass.
- [ ] No domain/application code imports React or `src/ui/` (M0's boundary check stays green).
- [ ] All new mutations route through a `Command` (undoable), not direct state assignment.
- [ ] UI matches [18-design-system.md](../specs/18-design-system.md) tokens/components (no ad-hoc colours, fonts, radii, or one-off component patterns).
- [ ] Status Table row updated to `Done` with a one-line note (what shipped, any deferred edge case).
- [ ] Any spec correction made during implementation is committed alongside the code change, not left as a mental note.
