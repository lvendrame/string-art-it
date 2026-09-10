# StringArtIt

Browser-based string-art design tool. Full functional spec: [`docs/specs/00-overview-and-scope.md`](docs/specs/00-overview-and-scope.md) (index of all 19 spec files). Design system + reference mockup: [`docs/specs/18-design-system.md`](docs/specs/18-design-system.md), [`docs/design/editor-mockup.dc.html`](docs/design/editor-mockup.dc.html).

## Start here for any implementation work

Read [`docs/plan/orchestrator.md`](docs/plan/orchestrator.md) first. It sequences development into milestones (M0–M10) mapped to `docs/specs/`, tracks status, and states dependencies. Find the first milestone not marked `Done`, read its listed specs, implement, test, then update its status row before ending the session.

Do not start implementing a feature spec without checking the orchestrator first — milestone order encodes real dependencies (e.g. the geometry engine must exist before any UI consumes it; the Command/undo-redo skeleton must exist before mutation-heavy features are built on top of it).
