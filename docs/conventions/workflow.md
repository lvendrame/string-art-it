# Workflow

How a milestone moves from "not started" to `Done` in this repo, and the conventions that keep `docs/plan/orchestrator.md` and `docs/specs/` trustworthy as the project grows.

## Spec files

- Numbered `NN-name.md` under `docs/specs/`, zero-padded two digits, sequential — next milestone takes the next free number (e.g. `19-play-mode.md`, then `20-help.md`).
- Every new spec file gets one row added to the index table in `docs/specs/00-overview-and-scope.md`.
- Structure to mirror (see any recent spec, e.g. `19-play-mode.md`, `20-help.md`): **Purpose**, then feature-specific sections, then a **Test Cases** section written as Gherkin scenarios. The Gherkin isn't decorative — it's the checklist the automated tests are written against.

## Orchestrator milestones

`docs/plan/orchestrator.md` has two things per milestone, both must be added/updated together:

1. A narrative entry: `### M<N> — <Name>` with `**Specs:**` / `**Depends on:**` / `**Deliverables:**` / `**Exit criteria:**` bullets.
2. A row in the `## Status Table` at the bottom: `| M<N> | <Name> | <deps> | <Status> | <notes> |`.

Start a milestone's Status Table row as `Not Started`. Flip it to `Done` **only after implementation, tests, and live verification (see below) are all complete** — the Notes column then gets a one-line summary of what shipped, what was tested, and any scope notes/known gaps (this repo's convention is to record known gaps honestly rather than let them go undocumented — e.g. M9's Notes explicitly says print preview has no physical-accuracy calibration, a real limitation of that milestone, not a mistake).

## Before calling a UI change done

Every UI-facing milestone or fix in this project's history has been verified live via the Playwright MCP tools against the actual dev server (`npm run dev`), not just unit tests — build/test/lint passing is necessary but not sufficient for a UI claim. The pattern used repeatedly:

1. Start the dev server in the background, navigate to it.
2. Handle the autosave-restore prompt if one appears (an existing autosaved project is common in this dev environment — `Restore` keeps whatever pins/threads/layers were already there, useful for exercising features that need real data).
3. Drive the actual interaction (click the button, switch modes, run through the control) and read back either an accessibility snapshot or a screenshot — don't infer success from the absence of a thrown error.
4. Check the console log for new errors after each interaction; a new console error is a real signal even if the visual result looks right (this caught a pre-existing React inline-style warning in `ModeSwitcher.tsx` during the Play-mode work — noted, not silently ignored, but also not fixed since it was out of scope for that change).
5. Stop the dev server and delete any scratch screenshots when done — they're verification artifacts, not deliverables.

## Testing conventions

- A new overlay/reference panel should mirror `StatisticsPanel.test.tsx`'s shape: plain `render`/`screen`/`fireEvent` from `@testing-library/react`, a `Close` button test (`fireEvent.click` → `onClose` called), and one test per distinct rendered state. Panels that don't need document state (like `HelpPanel`) shouldn't take an `EditorStore` prop just to match other panels — keep props minimal and let the test reflect that simplicity.
- Store-level behavior (anything on `EditorStore`) gets its own `describe` block in `EditorStore.test.ts` — see the `"EditorStore transient state (not undoable)"` block for the pattern used for non-history-tracked state like `mode`/`layerPanelTab`.
- When a spec's Gherkin scenario changes (a button removed, a behavior redefined), update the matching unit test in the same commit — don't let the spec and the test drift, even for a scenario rename.
