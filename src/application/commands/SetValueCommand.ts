import type { Command } from "./Command";

// Generic undoable "replace a value" command — snapshots before/after once at
// construction time, so callers never need a bespoke Command class for a plain field
// update (board dimensions, appearance, etc.). Reserve bespoke Commands for mutations
// with real cascading side effects (see docs/specs/11-erasers.md).
export class SetValueCommand<T> implements Command {
  constructor(
    private readonly apply: (value: T) => void,
    private readonly previous: T,
    private readonly next: T,
  ) {}

  execute(): void {
    this.apply(this.next);
  }

  undo(): void {
    this.apply(this.previous);
  }

  redo(): void {
    this.apply(this.next);
  }
}
