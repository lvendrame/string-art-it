import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EditorStore, type ThreadTool } from "@application/document";
import { ThreadToolbar } from "./ThreadToolbar";

describe("ThreadToolbar", () => {
  it("renders the pin-state legend", () => {
    const store = new EditorStore();
    render(<ThreadToolbar store={store} />);

    expect(screen.getByText("Normal")).toBeInTheDocument();
    expect(screen.getByText("Nearest candidate")).toBeInTheDocument();
    expect(screen.getByText("Active origin")).toBeInTheDocument();
    expect(screen.getByText("Used in this thread")).toBeInTheDocument();
  });

  const tools: [string, ThreadTool][] = [
    ["Draw [D]", "draw"],
    ["Zig-zag [Z]", "zigzag"],
    ["Parabolic [P]", "parabolic"],
    ["Select [S]", "select"],
    ["Eraser [E]", "eraser"],
    ["Segment [C]", "segment-eraser"],
  ];

  it.each(tools)("clicking %s sets the active Thread tool and marks it active", (label, tool) => {
    const store = new EditorStore();
    render(<ThreadToolbar store={store} />);

    const button = screen.getByRole("button", { name: label });

    fireEvent.click(button);

    expect(store.getState().threadTool).toBe(tool);
    expect(button.className).toContain("btn-active");
  });
});
