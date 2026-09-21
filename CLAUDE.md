# StringArtIt

Browser-based string-art design tool. Full functional spec: [`docs/specs/00-overview-and-scope.md`](docs/specs/00-overview-and-scope.md) (index of all spec files). Design system + reference mockup: [`docs/specs/18-design-system.md`](docs/specs/18-design-system.md), [`docs/design/editor-mockup.dc.html`](docs/design/editor-mockup.dc.html).

## Start here for any implementation work

Read [`docs/plan/orchestrator.md`](docs/plan/orchestrator.md) first. It sequences development into milestones (M0–M12 and counting) mapped to `docs/specs/`, tracks status, and states dependencies. Find the first milestone not marked `Done`, read its listed specs, implement, test, then update its status row before ending the session.

Do not start implementing a feature spec without checking the orchestrator first — milestone order encodes real dependencies (e.g. the geometry engine must exist before any UI consumes it; the Command/undo-redo skeleton must exist before mutation-heavy features are built on top of it).

## Conventions

Two linked files carry the patterns this codebase has settled on — read them before adding a new panel, mode, or milestone rather than re-deriving the pattern from scratch:

- [`docs/conventions/ui-patterns.md`](docs/conventions/ui-patterns.md) — the overlay/modal convention, tab-switcher styles, Editor-mode↔panel sync, and the data-driven-content pattern for reference/help-style panels.
- [`docs/conventions/workflow.md`](docs/conventions/workflow.md) — how a milestone gets scoped, specced, implemented, tested, and closed out, including when live browser verification is required before calling something done.

## Before considering any change done — run the real build

`npm run build` (`tsc -b && vite build`) is the exact command the Docker deploy pipeline runs, and it has caught real type errors that other checks missed, more than once:

- **`npx tsc --noEmit -p .` is not a substitute — it silently checks ZERO files** in this repo. The root `tsconfig.json` uses TS project references with `files: []`, which needs build mode (`tsc -b`) to actually traverse the referenced projects; `-p .`/`--noEmit` alone reports success having typechecked nothing. This exact trap already cost a deployment before (`tsc -b --force` was needed to surface real exhaustiveness gaps — see M25's orchestrator notes) and cost a second, later deployment when it recurred (a nested `function` declaration whose body used variables narrowed by an outer `if (!a || !b) return` guard — TS does not carry that narrowing into a nested function's body, only `tsc -b`'s real project-mode check caught it; `--noEmit -p .` reported clean).
- Always run **`npm run build`** itself (not just a typecheck flag) before calling a change complete — it's the one command guaranteed to match what the deploy server actually runs.
- Also run `npx vitest run` and `npx eslint .` — but neither substitutes for the build; `vitest` doesn't typecheck at all by default, and passing tests plus a misleading `tsc --noEmit -p .` is exactly the combination that produced the last two failed deployments.
