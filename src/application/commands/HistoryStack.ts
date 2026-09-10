import type { Command } from "./Command";

// Linear undo/redo history (docs/specs/10-undo-redo.md): running a new command clears
// any redo history — this is not a branching undo tree.
export class HistoryStack {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];

  run(command: Command): void {
    command.execute();
    this.undoStack.push(command);
    this.redoStack = [];
  }

  undo(): void {
    const command = this.undoStack.pop();
    if (!command) return;
    command.undo();
    this.redoStack.push(command);
  }

  redo(): void {
    const command = this.redoStack.pop();
    if (!command) return;
    command.redo();
    this.undoStack.push(command);
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  // Loading a different document (docs/specs/16-persistence.md) starts a fresh undo
  // history — undoing past a load into a previous document's edits would be incoherent.
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}
