import { describe, expect, it } from "vitest";
import type { Command } from "./Command";
import { HistoryStack } from "./HistoryStack";

// A minimal in-memory command: increments/decrements a counter held in a plain object,
// standing in for a real document mutation (see docs/specs/10-undo-redo.md's list of
// undoable operations — the mechanism is generic across all of them).
function makeIncrementCommand(counter: { value: number }): Command {
  return {
    execute: () => { counter.value += 1; },
    undo: () => { counter.value -= 1; },
    redo: () => { counter.value += 1; },
  };
}

describe("HistoryStack", () => {
  it("execute applies the change", () => {
    const counter = { value: 0 };
    const history = new HistoryStack();

    history.run(makeIncrementCommand(counter));

    expect(counter.value).toBe(1);
  });

  it("undo reverses the last command", () => {
    const counter = { value: 0 };
    const history = new HistoryStack();
    history.run(makeIncrementCommand(counter));

    history.undo();

    expect(counter.value).toBe(0);
  });

  it("redo re-applies an undone command", () => {
    const counter = { value: 0 };
    const history = new HistoryStack();
    history.run(makeIncrementCommand(counter));
    history.undo();

    history.redo();

    expect(counter.value).toBe(1);
  });

  it("running a new command after an undo clears the redo stack", () => {
    // Mirrors docs/specs/10-undo-redo.md "Redo stack invalidation": creating Pin Path Y
    // after undoing Pin Path X must not let Redo bring X back.
    const counter = { value: 0 };
    const history = new HistoryStack();
    history.run(makeIncrementCommand(counter)); // counter: 1
    history.undo(); // counter: 0, redo stack has 1 entry

    history.run(makeIncrementCommand(counter)); // counter: 1, new command
    history.redo(); // should be a no-op — redo stack was cleared

    expect(counter.value).toBe(1);
    expect(history.canRedo()).toBe(false);
  });

  it("clear() empties both stacks", () => {
    const counter = { value: 0 };
    const history = new HistoryStack();
    history.run(makeIncrementCommand(counter));
    history.undo();

    history.clear();

    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(false);
  });

  it("undo/redo on an empty history is a no-op", () => {
    const history = new HistoryStack();

    expect(() => history.undo()).not.toThrow();
    expect(() => history.redo()).not.toThrow();
    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(false);
  });

  it("cascading effects captured in one command undo together", () => {
    // Mirrors docs/specs/11-erasers.md: deleting a pin referenced by two threads removes
    // the pin and both thread segments as a SINGLE undo step.
    const state = { pinExists: true, segmentsRemaining: 2 };
    const cascadingDelete: Command = {
      execute: () => { state.pinExists = false; state.segmentsRemaining = 0; },
      undo: () => { state.pinExists = true; state.segmentsRemaining = 2; },
      redo: () => { state.pinExists = false; state.segmentsRemaining = 0; },
    };
    const history = new HistoryStack();

    history.run(cascadingDelete);
    expect(state).toEqual({ pinExists: false, segmentsRemaining: 0 });

    history.undo();
    expect(state).toEqual({ pinExists: true, segmentsRemaining: 2 });
  });
});
