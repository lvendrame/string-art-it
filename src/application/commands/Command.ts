// Every document mutation goes through a Command so it is undoable/redoable and any
// cascading effects (e.g. deleting a pin that removes connected thread segments) are
// captured atomically. See docs/specs/01-architecture.md §Command Architecture and
// docs/specs/10-undo-redo.md.
export interface Command {
  execute(): void;
  undo(): void;
  redo(): void;
}
