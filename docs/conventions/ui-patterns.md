# UI Patterns

Conventions this codebase has already settled on. Match them instead of inventing a new variant — consistency matters more than any individual pattern being "better."

## Overlay panels (Stats / Print / Help)

`StatisticsPanel.tsx`, `PrintPreviewPanel.tsx`, and `HelpPanel.tsx` (in `src/ui/panels/`) all follow the same convention, driven from one `EditorShell.tsx` state slot:

```ts
const [overlay, setOverlay] = useState<"none" | "print" | "stats" | "help">("none");
```

- A toolbar button sets `overlay` to its id; the panel renders conditionally inside the `flex:1` content row.
- Each panel is a full-bleed layer, **not** a centered dialog: `<OverlayPanel className="...">` (`src/ui/panels/OverlayPanel.tsx`) supplies the shared shell — `position: absolute; inset: 0; background: var(--bg-app); z-index: 10` — a consumer adds its own class for internal layout (`overflow-y: auto; padding` for a single-column panel like Stats/Help, `display: flex` for PrintPreviewPanel's sidebar+preview columns). `<OverlayPanelHeader title={...} onClose={...} />` supplies the title + Close button row shared by Stats and Help. PrintPreviewPanel keeps its own bespoke header markup instead — its title/close-button sizing is deliberately smaller (13px vs 15px, nested in a 300px sidebar), not drift, so it wasn't worth forcing into the shared header.
- **Deliberately no backdrop, no Escape-to-close, no `role="dialog"`/`aria-modal`.** This has been a conscious choice each time a new overlay was added (Help included) — introducing one of these for a single panel would fragment the UX, since users would then reasonably expect it everywhere. If this ever changes, change it for all three at once.
- A panel only needs the props it actually uses — `HelpPanel` takes no `store` because it's pure static content; don't pass a whole `EditorStore` "just in case."
- Adding a fourth overlay: extend the union, add the button, add the conditional render, wrap the content in `<OverlayPanel>` (+ `<OverlayPanelHeader>` if its header matches Stats/Help's sizing). That's the whole pattern.

## Anchored settings popover (Export / Language / Grid Settings / Change Background / Zoom)

For a small cluster of controls that belongs next to the button that opens it — not a full page — five components share one shape: `ExportMenu.tsx`, `LanguageSwitcher.tsx`, `GridSettingsPopover.tsx`, `ChangeBackgroundPopover.tsx`, and `ZoomControl.tsx`. This is a different problem shape from the full-bleed overlay above: a handful of fields or actions anchored to their trigger, not a whole-screen panel.

- Trigger wrapper gets the shared `.popover-trigger` class (`position: relative`, from `src/ui/AnchoredPopover.css`) — each consumer supplies its own trigger content (plain button, icon button, or — `ZoomControl` — an editable combobox input) since that varies too much to share.
- The panel itself is `<AnchoredPopover align="left"|"right" variant="panel"|"panel-2">` (`src/ui/AnchoredPopover.tsx`): `position: absolute; top: 110%`, `z-index: 20`, `border: 1px solid var(--border)`, `border-radius: var(--radius-md)`, elevation via `var(--shadow-float)`. `variant="panel"` (default, `background: var(--bg-panel)`) is for settings/menu popovers; `variant="panel-2"` (`background: var(--bg-panel-2)`) is for option-list popovers (LanguageSwitcher, ZoomControl). Pass any extra class via `className` for panel-specific padding/gap/min-width.
- Open/close is local `useState<boolean>` on the trigger component — no shared `overlay` union, since these are independent, can-coexist-with-others popovers, not mutually-exclusive full-page states.
- Dismissal: `usePopoverDismiss(containerRef, open, onClose, { escapeKey? })` (`src/ui/usePopoverDismiss.ts`) — pointerdown outside the container and Escape both close it by default; pass `escapeKey: false` when the consumer handles Escape itself with different behavior per context (`ZoomControl`'s input reverts on Escape rather than just closing).
- Trigger gets `aria-haspopup`/`aria-expanded`; the panel gets a role appropriate to its content (`listbox` for a menu of choices, plain `div` for a settings form) via `AnchoredPopover`'s pass-through props.
- Adding a new one: copy `GridSettingsPopover.tsx` (simplest form-fields case) or `LanguageSwitcher.tsx` (if it's a list of selectable options needing roving-tabindex).

## Tab-switcher styles

Two existing precedents, used for different reasons:

- **`ModeSwitcher.tsx`** (top-bar Editor mode tabs): segmented pill buttons in a bordered container (`.btn.mode-switcher__tab`, `.btn-active` for the selected one), with full ARIA (`role="tablist"`/`role="tab"`/`aria-selected"`). No roving-tabindex/arrow-key navigation implemented.
- **`LayersPanel.tsx`** (Pin Layers / Thread Layers): underline-style tabs using the shared `.tab-underline`/`.tab-underline--active` classes (`theme.css`) — `flex:1`, no ARIA roles, and used **bare** (no `.btn`), so no hover feedback — that's this component's original behavior, preserved deliberately.

`HelpPanel.tsx`'s tab bar combines them: the underline visual style (better suited to many tabs in a row) plus full ARIA (`role="tablist"`/`tab`/`aria-selected`/`aria-controls`, `role="tabpanel"` on the content) since it's a modal a keyboard/screen-reader user needs to navigate. It compounds `.tab-underline` **with** `.btn` (`className="btn tab-underline ..."`), unlike LayersPanel — HelpPanel's tabs already had hover feedback before the CSS-file migration, so that's preserved too. Neither existing precedent alone was both visually and accessibly right for a 7-tab modal — use judgment like this when the two existing patterns don't cleanly fit, but default to matching one of them exactly when either would do.

`.tab-underline` is declared twice in `theme.css` — once bare, once compounded with `.btn` — because a plain 1-class `.tab-underline` rule and `.btn`'s own 1-class rule would otherwise tie in specificity when both classes are present on one element (order-dependent, the exact bug class `.btn.autosave-dialog__restore` exists to avoid — see "Component styling" below). Adding a third tab-switcher that needs `.btn`'s hover but different underline colors: extend the compounded rule, don't invent a new selector shape.

## Component styling (CSS files vs inline style)

Every component styles itself via a co-located CSS file, not inline `style={{}}` objects — established in `AutosaveDialog.tsx`/`.css` and extended to the whole codebase in M30 (`docs/plan/orchestrator.md`).

- **File placement**: `Foo.tsx` → sibling `Foo.css`, imported as a side-effect (`import "./Foo.css";`) at the top of the component.
- **Naming**: kebab-case component root class (`mode-switcher`), BEM elements (`.mode-switcher__tab`), BEM modifiers for component-local state (`.layer-row--active`). `.btn-active` is the one exception — it's the modifier for the *shared* `.btn` utility (`theme.css`), not a per-component BEM modifier, and many call sites depend on that exact string; don't invent a second name for the same thing.
- **The `.btn` specificity-safety rule**: any component rule that overrides a `.btn` default (background, color, border, or anything else `.btn` itself declares) must be written `.btn.<component-class> { ... }` inside the component's own CSS file — never `.<component-class>` alone. A bare same-specificity rule ties with `.btn` and is decided by cascade *source order*, which depends on the bundler's CSS chunk order, not anything this codebase controls — the exact bug `.btn.autosave-dialog__restore` was written to fix. `src/test/style/cascadeGuard.test.ts` enforces this automatically: it fails on any same-element class combination where two different-file rules tie at equal specificity with different values. If a component rule doesn't touch any property `.btn` also sets, no compounding is needed — check what `.btn` actually declares before reaching for the compound form reflexively.
- **Reasoning about specificity must consider the real CSS property, not the literal declaration text**: `border: none` (shorthand) and `border-color: var(--x)` (longhand) both resolve to the same physical `border-color` property and *do* compete on specificity in a real browser, even though they're different-looking declarations. `cascadeGuard.test.ts` compares declared property names as literal strings, so it won't catch a shorthand-vs-longhand collision across two rules — that gap is real, not merely theoretical; check it by hand when a component rule uses `border`/`background`/`margin`/etc. shorthand near a rule that sets one of its longhand sub-properties.
- **Conditional/two-state styling**: toggle a BEM modifier class via the same template-string idiom `.btn-active` already uses — `` `btn ${base}${cond ? " modifier" : ""}` `` — no `clsx`/`classnames` dependency. When a value needs to work identically whether or not `.btn` is also present (e.g. a tab-underline style used bare in one consumer, compounded in another), declare the rule **twice** — once bare, once `.btn`-compounded — rather than relying on one to cascade into the other; see `.tab-underline` in `theme.css`.
- **Shared cross-component classes** (used by more than one component) live in `theme.css`, not a per-component file — matches `.btn`, `.btn-active`, `.mono`, `.is-disabled`, `.tab-underline`. Two more were extracted during the migration when duplication crossed from "same value" into "same value *and* same structural shape": `<AnchoredPopover>`/`usePopoverDismiss` (`src/ui/AnchoredPopover.tsx`/`.css`, `src/ui/usePopoverDismiss.ts`) and `<OverlayPanel>`/`<OverlayPanelHeader>` (`src/ui/panels/OverlayPanel.tsx`/`.css`) — see their own sections above.
- **Genuinely dynamic values stay inline** — a value computed at runtime with no fixed set of options (not a themed token, not a two-state toggle) has nowhere else to go. The only real cases in this codebase: `Canvas.tsx`'s SVG `cursor` (a 5-state runtime lookup across mode/tool/panning), `PrintPreviewPanel.tsx`'s tile-grid `gridTemplateColumns` (the tile count is a runtime value), and `StatisticsPanel.tsx`'s thread-color swatch (`style={{background: colour}}`, an arbitrary per-thread hex value, not a token). `RadialContextMenu.tsx`'s `MENU_STYLE` is a different case — it's the third-party `@spaceymonk/react-radial-menu` library's own theming mechanism (CSS custom properties it reads internally), passed as a prop the library expects, not this component's own styling; don't try to move it to a CSS class.
- **Regression guard**: `src/test/style/componentStyleSnapshot.test.ts` freezes every component's classes, the CSS rules those classes satisfy, and every remaining inline `style={...}` expression's exact source text — one snapshot file per component under `src/test/style/__snapshots__/components/`. Any styling change (intentional or not) fails the relevant component's test until the snapshot is reviewed and updated (`npx vitest run src/test/style -u`, then read the diff before trusting it).

## Shared `<Button>` component (cva variants)

`src/ui/Button.tsx`/`.css` wraps the `.btn` primitive with `class-variance-authority` (`cva`) for the colour/intent and icon-size treatments that recur across components — `variant`: `default` | `toggle` (accent-tinted, matches `.btn-active`'s colours) | `primary` (solid accent fill, the one "this is the panel's main action" look) | `danger` (LayersPanel's delete-action colour); `size`: `default` | `icon-md` | `icon-sm` (the two icon-button paddings/radii already established by OverlayPanelHeader vs PrintPreviewPanel's close button). Currently adopted only by the three Close buttons (`OverlayPanelHeader`, `PrintPreviewPanel`) — the rest of the app's ~40 other `.btn`-class call sites still use the plain template-string idiom above and haven't been migrated.

- **When to reach for `<Button>` vs the bare `.btn ${...}` template idiom**: `<Button>` when the treatment is (or should be) one of the shared `variant`/`size` values above, especially for anything cross-component. The bare template idiom stays fine for a genuinely one-off, single-component toggle (e.g. `.board-setup__shape-btn`'s selected state) — don't force every button through `<Button>` just because it exists.
- **Adding a new variant/size**: add one case to `buttonVariants` in `Button.tsx` and one `.btn.btn--x` rule in `Button.css` — never a bare `.btn--x` rule (same specificity-vs-source-order trap `.btn.autosave-dialog__restore` was written to fix; see above).
- **Known gap**: `cascadeGuard.test.ts` and `componentStyleSnapshot.test.ts` both static-scan literal JSX `className="…"` strings (including the `` `btn ${cond ? "x" : ""}` `` template idiom) — neither can see a class combo `cva` assembles at runtime, so a future `Button.css` rule that loses the specificity fight won't be caught automatically. The double-`.btn` discipline above has to be kept by hand for this component; it's documented again as a code comment in `Button.tsx` itself.

## Editor mode ↔ side-panel sync

`EditorStore.setMode()` (`src/application/document/EditorStore.ts`) auto-syncs `state.layerPanelTab` when entering Pin or Thread mode (switches the Layers panel to the matching tab), and leaves it untouched for Select/Pan/Play (no matching layer kind to switch to). This is the template for "switching to X should also update Y for consistency" requests — the sync belongs in the store method that changes the driving state, not in a `useEffect` on the consuming component, so it can't be missed by a component that doesn't render at the time.

## Data-driven reference/help content

For a panel that's structurally repeated content (a list of "label — description" rows, grouped under headings, once per tab), don't write N near-identical bespoke tab components. `src/ui/panels/help/` is the template:

- `helpContent.ts` — a typed data module (`HelpTab[]`, each with `sections: HelpSection[]`, each section a `heading?` + `items: {label, description}[]`).
- `HelpPanel.tsx` — one shell component (tab bar + active-tab lookup) plus one tiny generic `HelpSectionView` that renders any section.

This keeps all the actual prose in one reviewable place and makes the feature trivially testable (assert on rendered text, not on N component trees). Reach for this shape again for any future "reference" or "glossary" style panel.

**Content accuracy rule**: when writing this kind of descriptive/reference content, describe only what's actually implemented in code — cross-check against the real component/hook, not just the matching spec file. Specs can describe an intended-but-not-yet-built capability (this repo has a few: mouse-wheel zoom, a "100%" zoom shortcut, Delete/Backspace-to-remove, shift-click multi-select, arrow-key nudging — none exist in code as of M12). Documenting an unimplemented feature as if it works is worse than a gap in coverage.

## Mailto contact link

This app has no backend, so `AboutTabContent.tsx` (Help panel's About tab) "sends" its contact form via a plain `mailto:` `<a>` href built from the form's current state — it opens the user's own configured mail client, addressed and pre-filled; it never transmits anything itself. Keep the element an `<a href="mailto:...">`, not a `<button>` + `window.open`/`location.href=`, so tests can assert on the rendered href directly instead of invoking a real mail client; when the form is incomplete, still render a real `href` (e.g. `"#"`) with `aria-disabled` + a click handler that calls `preventDefault()`, rather than omitting `href` — an anchor without an `href` attribute loses its `link` role in the accessibility tree, which breaks both `getByRole("link")` assertions and keyboard/screen-reader affordance.

## Play mode transport (reference example)

`src/ui/toolbars/PlayToolbar.tsx` + `usePlaybackTransport.ts` — worth knowing as a worked example of iterating on a control layout: went from a 2-row grid of 6 icons (First/Previous/Play/Stop/Next/Last) to a single row of 5 (First/Previous/Play-Pause/Next/Last), because Stop and First turned out to be functionally identical (both pause + reset to frame 0) — a good reminder to check whether two controls are actually redundant before just rearranging them. Frames are 0-based (frame 0 = nothing drawn yet, not "the first segment"); pressing Play again while already at the last frame restarts from 0 rather than doing nothing, matching standard media-player convention.
