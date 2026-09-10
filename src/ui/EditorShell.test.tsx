import { act, render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EditorStore } from "../application/document";
import { EditorShell } from "./EditorShell";

describe("EditorShell undo/redo shortcuts", () => {
  it("Ctrl/Cmd+Z undoes the last board dimension change", () => {
    const store = new EditorStore();
    const before = store.getState().board.dimensions.diameter;
    store.setBoardDimensions({ diameter: 90 });
    render(<EditorShell store={store} onNewProject={() => {}} />);

    fireEvent.keyDown(window, { key: "z", ctrlKey: true });

    expect(store.getState().board.dimensions.diameter).toBe(before);
  });

  it("Ctrl/Cmd+Shift+Z redoes it", () => {
    const store = new EditorStore();
    store.setBoardDimensions({ diameter: 90 });
    store.undo();
    render(<EditorShell store={store} onNewProject={() => {}} />);

    fireEvent.keyDown(window, { key: "z", ctrlKey: true, shiftKey: true });

    expect(store.getState().board.dimensions.diameter).toBe(90);
  });

  it("does not intercept the shortcut while a text field has focus", () => {
    const store = new EditorStore();
    store.setBoardDimensions({ diameter: 90 });
    render(<EditorShell store={store} onNewProject={() => {}} />);
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    fireEvent.keyDown(input, { key: "z", ctrlKey: true });

    expect(store.getState().board.dimensions.diameter).toBe(90); // unchanged
    document.body.removeChild(input);
  });

  it("Undo/Redo toolbar buttons reflect and drive history state", () => {
    const store = new EditorStore();
    render(<EditorShell store={store} onNewProject={() => {}} />);
    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();

    act(() => store.setBoardDimensions({ diameter: 90 }));
    expect(screen.getByRole("button", { name: "Undo" })).not.toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(store.getState().board.dimensions.diameter).not.toBe(90);
  });
});
