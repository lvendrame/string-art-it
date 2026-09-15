# UI Patterns

Conventions this codebase has already settled on. Match them instead of inventing a new variant — consistency matters more than any individual pattern being "better."

## Overlay panels (Stats / Print / Help)

`StatisticsPanel.tsx`, `PrintPreviewPanel.tsx`, and `HelpPanel.tsx` (in `src/ui/panels/`) all follow the same convention, driven from one `EditorShell.tsx` state slot:

```ts
const [overlay, setOverlay] = useState<"none" | "print" | "stats" | "help">("none");
```

- A toolbar button sets `overlay` to its id; the panel renders conditionally inside the `flex:1` content row.
- Each panel is a full-bleed layer, **not** a centered dialog: `position: absolute; inset: 0; background: var(--bg-app); zIndex: 10; overflowY: auto`, with an internal header row (title + a "Close" button calling `onClose`).
- **Deliberately no backdrop, no Escape-to-close, no `role="dialog"`/`aria-modal`.** This has been a conscious choice each time a new overlay was added (Help included) — introducing one of these for a single panel would fragment the UX, since users would then reasonably expect it everywhere. If this ever changes, change it for all three at once.
- A panel only needs the props it actually uses — `HelpPanel` takes no `store` because it's pure static content; don't pass a whole `EditorStore` "just in case."
- Adding a fourth overlay: extend the union, add the button, add the conditional render. That's the whole pattern.

## Anchored settings popover (Export / Language / Grid Settings)

For a small cluster of controls that belongs next to the button that opens it — not a full page — three components share one shape: `ExportMenu.tsx`, `LanguageSwitcher.tsx`, and `GridSettingsPopover.tsx`. This is a different problem shape from the full-bleed overlay above: a handful of fields or actions anchored to their trigger, not a whole-screen panel.

- Trigger wrapper is `position: relative`; the panel is `position: absolute; top: 110%` (`left: 0` or `right: 0` depending on which edge should stay on-screen), `zIndex: 20`.
- Panel styling: `background: var(--bg-panel)` (or `--bg-panel-2`), `border: 1px solid var(--border)`, `borderRadius: var(--radius-md)`, inner controls/option rows use `--radius-sm`, elevation via `var(--shadow-float)`.
- Open/close is local `useState<boolean>` on the trigger component — no shared `overlay` union, since these are independent, can-coexist-with-others popovers, not mutually-exclusive full-page states.
- Dismissal: pointerdown outside the container and Escape both close it (see `LanguageSwitcher.tsx`'s `containerRef` + `useEffect` pair) — unlike the full-bleed overlay convention above, an anchored popover *should* close this way, since it's transient and anchored rather than a page you navigate into.
- Trigger gets `aria-haspopup`/`aria-expanded`; the panel gets a role appropriate to its content (`listbox` for a menu of choices, plain `div` for a settings form).
- Adding a new one: copy `GridSettingsPopover.tsx` (simplest form-fields case) or `LanguageSwitcher.tsx` (if it's a list of selectable options needing roving-tabindex).

## Tab-switcher styles

Two existing precedents, used for different reasons:

- **`ModeSwitcher.tsx`** (top-bar Editor mode tabs): segmented pill buttons in a bordered container, with full ARIA (`role="tablist"`/`role="tab"`/`aria-selected"`). No roving-tabindex/arrow-key navigation implemented.
- **`LayersPanel.tsx`** (Pin Layers / Thread Layers): underline-style tabs — `flex:1, border:none, borderBottom: 2px solid var(--accent)|transparent`, no ARIA roles.

`HelpPanel.tsx`'s tab bar combines them: the underline visual style (better suited to many tabs in a row) plus full ARIA (`role="tablist"`/`tab`/`aria-selected`/`aria-controls`, `role="tabpanel"` on the content) since it's a modal a keyboard/screen-reader user needs to navigate. Neither existing precedent alone was both visually and accessibly right for a 7-tab modal — use judgment like this when the two existing patterns don't cleanly fit, but default to matching one of them exactly when either would do.

## Editor mode ↔ side-panel sync

`EditorStore.setMode()` (`src/application/document/EditorStore.ts`) auto-syncs `state.layerPanelTab` when entering Pin or Thread mode (switches the Layers panel to the matching tab), and leaves it untouched for Select/Pan/Play (no matching layer kind to switch to). This is the template for "switching to X should also update Y for consistency" requests — the sync belongs in the store method that changes the driving state, not in a `useEffect` on the consuming component, so it can't be missed by a component that doesn't render at the time.

## Data-driven reference/help content

For a panel that's structurally repeated content (a list of "label — description" rows, grouped under headings, once per tab), don't write N near-identical bespoke tab components. `src/ui/panels/help/` is the template:

- `helpContent.ts` — a typed data module (`HelpTab[]`, each with `sections: HelpSection[]`, each section a `heading?` + `items: {label, description}[]`).
- `HelpPanel.tsx` — one shell component (tab bar + active-tab lookup) plus one tiny generic `HelpSectionView` that renders any section.

This keeps all the actual prose in one reviewable place and makes the feature trivially testable (assert on rendered text, not on N component trees). Reach for this shape again for any future "reference" or "glossary" style panel.

**Content accuracy rule**: when writing this kind of descriptive/reference content, describe only what's actually implemented in code — cross-check against the real component/hook, not just the matching spec file. Specs can describe an intended-but-not-yet-built capability (this repo has a few: mouse-wheel zoom, a "100%" zoom shortcut, Delete/Backspace-to-remove, shift-click multi-select, arrow-key nudging — none exist in code as of M12). Documenting an unimplemented feature as if it works is worse than a gap in coverage.

## Play mode transport (reference example)

`src/ui/toolbars/PlayToolbar.tsx` + `usePlaybackTransport.ts` — worth knowing as a worked example of iterating on a control layout: went from a 2-row grid of 6 icons (First/Previous/Play/Stop/Next/Last) to a single row of 5 (First/Previous/Play-Pause/Next/Last), because Stop and First turned out to be functionally identical (both pause + reset to frame 0) — a good reminder to check whether two controls are actually redundant before just rearranging them. Frames are 0-based (frame 0 = nothing drawn yet, not "the first segment"); pressing Play again while already at the last frame restarts from 0 rather than doing nothing, matching standard media-player convention.
